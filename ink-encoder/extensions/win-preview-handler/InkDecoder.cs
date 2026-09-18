using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using ICSharpCode.SharpZipLib.Zip.Compression;
using ICSharpCode.SharpZipLib.Zip.Compression.Streams;

namespace InkPreviewHandler;

/// <summary>
/// Dekodiert .ink (microPhotoFrame) zu einem Bitmap — ohne Node/sharp.
/// </summary>
internal static class InkDecoder
{
    public static Bitmap DecodeFile(string path)
    {
        var data = ReadAllBytesAllowingShare(path);
        return Decode(data);
    }

    /// <summary>
    /// Liest die .ink mit FileShare.ReadWrite — sonst schlägt die Vorschau oft fehl, während der Explorer/Indexer die Datei hält.
    /// </summary>
    public static byte[] ReadAllBytesAllowingShare(string path)
    {
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete);
        using var ms = new MemoryStream();
        fs.CopyTo(ms);
        return ms.ToArray();
    }

    public static Bitmap Decode(byte[] uint8Data)
    {
        if (uint8Data.Length < 4)
            throw new InvalidDataException(".ink zu kurz.");

        var displayChar = (char)uint8Data[1];
        if (!DisplayCatalog.TryGet(displayChar, out var display))
            throw new InvalidDataException(
                $"Unbekannte Display-ID im Header: '{displayChar}' (0x{(uint)displayChar:X2}).");

        var version = uint8Data[0];
        var dataPtr = 4;
        var legacyFiveByte = false;
        var legacyCompression = 0;

        if (version == 2 && uint8Data.Length > 6 && uint8Data[4] <= 2 &&
            uint8Data[5] != 0x78 && uint8Data[5] != 0x58)
        {
            legacyFiveByte = true;
            legacyCompression = uint8Data[4];
            dataPtr = 5;
        }

        // microPhotoFrame EInk.Encode: Pixelraster immer Katalog-Breite×Höhe; Byte 3 = Hochkant-Metadaten
        // (Canvas zeichnet mit +90°). v0: Byte 3 = LZW minCodeSize — nicht als Orientierung werten.
        var w = display.Width;
        var h = display.Height;

        var palette = display.Palette;
        var numColors = palette.Length;
        var rowWidth = w;
        var totalPixels = w * h;
        var defaultColor = palette.Length > 0 ? palette[0] : Color.White;

        var mask = CreateGeometryMask(w, h, display.IsRound);
        var validPixelCount = mask == null
            ? totalPixels
            : CountMask(mask);

        List<int> decodedPixels;

        if (version >= 1 && version <= 3)
        {
            if (legacyFiveByte)
            {
                decodedPixels = legacyCompression switch
                {
                    1 => DecompressRle(uint8Data, dataPtr, validPixelCount),
                    2 => DecompressNone(uint8Data, dataPtr, validPixelCount),
                    _ => DecompressLzw(uint8Data, dataPtr, 3, validPixelCount)
                };
            }
            else if (version == 3)
            {
                var inflated = RawDeflateInflate(uint8Data, dataPtr);
                if (inflated.Length < validPixelCount)
                    throw new InvalidDataException($"INK v3: nach Inflate {inflated.Length} B, erwartet {validPixelCount}.");
                InversePaethInPlace(inflated, validPixelCount, rowWidth, numColors);
                decodedPixels = new List<int>(validPixelCount);
                for (var i = 0; i < validPixelCount; i++)
                    decodedPixels.Add(inflated[i]);
            }
            else if (version == 2)
            {
                var inflated = RawDeflateInflate(uint8Data, dataPtr);
                if (inflated.Length < validPixelCount)
                    throw new InvalidDataException($"INK v2: nach Inflate {inflated.Length} B, erwartet ≥ {validPixelCount}.");
                decodedPixels = new List<int>(validPixelCount);
                for (var i = 0; i < validPixelCount; i++)
                    decodedPixels.Add(inflated[i]);
            }
            else
            {
                decodedPixels = DecompressLzw(uint8Data, dataPtr, 3, validPixelCount);
            }
        }
        else
        {
            if (uint8Data.Length < 5)
                throw new InvalidDataException($"Unbekannte .ink-Version (erstes Byte: {version}).");
            var minCodeSizeV0 = uint8Data[3];
            decodedPixels = DecompressLzw(uint8Data, 4, minCodeSizeV0, validPixelCount);
        }

        var rgba = new byte[totalPixels * 4];
        var decodedIdx = 0;
        for (var i = 0; i < totalPixels; i++)
        {
            Color color;
            if (mask != null && mask[i] == 0)
                color = defaultColor;
            else
            {
                var idx = decodedPixels[decodedIdx++];
                color = idx >= 0 && idx < palette.Length ? palette[idx] : defaultColor;
            }

            var pos = i * 4;
            rgba[pos] = color.R;
            rgba[pos + 1] = color.G;
            rgba[pos + 2] = color.B;
            rgba[pos + 3] = 255;
        }

        var bmp = RgbaToBitmap(rgba, w, h);
        // Hochkant: Kopf zeigt im Raster nach links → Rotate270 stellt aufrecht. Empirisch verifiziert.
        if (version is >= 1 and <= 3 && (uint8Data[3] & 1) != 0 && !display.IsRound)
            bmp.RotateFlip(RotateFlipType.Rotate270FlipNone);

        return bmp;
    }

    private static Bitmap RgbaToBitmap(byte[] rgba, int w, int h)
    {
        var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        try
        {
            var stride = bd.Stride;
            var buffer = new byte[stride * h];
            for (var y = 0; y < h; y++)
            {
                for (var x = 0; x < w; x++)
                {
                    var si = (y * w + x) * 4;
                    var di = y * stride + x * 4;
                    buffer[di] = rgba[si + 2];
                    buffer[di + 1] = rgba[si + 1];
                    buffer[di + 2] = rgba[si];
                    buffer[di + 3] = rgba[si + 3];
                }
            }

            Marshal.Copy(buffer, 0, bd.Scan0, buffer.Length);
        }
        finally
        {
            bmp.UnlockBits(bd);
        }

        return bmp;
    }

    private static byte[]? CreateGeometryMask(int w, int h, bool isRound)
    {
        if (!isRound) return null;
        var mask = new byte[w * h];
        var cx = w / 2.0;
        var cy = h / 2.0;
        var r = Math.Min(w, h) / 2.0;
        for (var y = 0; y < h; y++)
        {
            for (var x = 0; x < w; x++)
            {
                var dx = x - cx;
                var dy = y - cy;
                mask[y * w + x] = (dx * dx + dy * dy <= r * r) ? (byte)1 : (byte)0;
            }
        }

        return mask;
    }

    private static int CountMask(byte[] mask)
    {
        var n = 0;
        foreach (var b in mask)
            if (b != 0) n++;
        return n;
    }

    /// <summary>
    /// v2/v3 Payload ist <b>raw deflate</b> (RFC 1951), wie Browser <c>CompressionStream('deflate-raw')</c> und Firmware tinfl —
    /// kein zlib-Wrapper (kein 0x78-Header). Ohne <c>Inflater(true)</c> meldet SharpZipLib u.a. „Header checksum illegal“.
    /// </summary>
    private static byte[] RawDeflateInflate(byte[] src, int offset)
    {
        using var msIn = new MemoryStream(src, offset, src.Length - offset);
        var inflater = new Inflater(true);
        using var zs = new InflaterInputStream(msIn, inflater);
        using var msOut = new MemoryStream();
        zs.CopyTo(msOut);
        return msOut.ToArray();
    }

    private static int PaethPredictor(int a, int b, int c)
    {
        var p = a + b - c;
        var pa = Math.Abs(p - a);
        var pb = Math.Abs(p - b);
        var pc = Math.Abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    }

    private static void InversePaethInPlace(byte[] data, int count, int rowWidth, int numColors)
    {
        for (var i = 0; i < count; i++)
        {
            var a = rowWidth > 0 && i % rowWidth > 0 ? data[i - 1] : 0;
            var b = rowWidth > 0 && i >= rowWidth ? data[i - rowWidth] : 0;
            var c = rowWidth > 0 && i % rowWidth > 0 && i >= rowWidth ? data[i - rowWidth - 1] : 0;
            var pred = rowWidth > 0 ? PaethPredictor(a, b, c) : (i > 0 ? data[i - 1] : 0);
            data[i] = (byte)((data[i] + pred) % numColors);
        }
    }

    private static List<int> DecompressLzw(byte[] uint8Data, int dataPtr, int minCodeSize, int validPixelCount)
    {
        var clearCode = 1 << minCodeSize;
        var eoiCode = clearCode + 1;
        var bitBuf = 0;
        var bitCount = 0;
        var ptr = dataPtr;
        var codeSize = minCodeSize + 1;

        int ReadCode()
        {
            while (bitCount < codeSize)
            {
                if (ptr >= uint8Data.Length) return eoiCode;
                bitBuf |= uint8Data[ptr++] << bitCount;
                bitCount += 8;
            }

            var code = bitBuf & ((1 << codeSize) - 1);
            bitBuf >>= codeSize;
            bitCount -= codeSize;
            return code;
        }

        var dict = new List<List<int>>();
        void InitDict()
        {
            dict.Clear();
            for (var i = 0; i < (1 << minCodeSize); i++)
                dict.Add(new List<int> { i });
            dict.Add(new List<int>());
            dict.Add(new List<int>());
        }

        InitDict();

        var decodedPixels = new List<int>(validPixelCount);
        var oldCode = -1;

        while (decodedPixels.Count < validPixelCount)
        {
            var code = ReadCode();
            if (code == eoiCode) break;
            if (code == clearCode)
            {
                InitDict();
                codeSize = minCodeSize + 1;
                oldCode = -1;
                continue;
            }

            List<int>? entry;
            if (code < dict.Count && dict[code].Count > 0)
                entry = dict[code];
            else if (code == dict.Count && oldCode >= 0)
            {
                var oc = dict[oldCode];
                entry = new List<int>(oc) { oc[0] };
            }
            else
                break;

            foreach (var v in entry)
            {
                if (decodedPixels.Count < validPixelCount)
                    decodedPixels.Add(v);
            }

            if (oldCode >= 0)
            {
                var newEntry = new List<int>(dict[oldCode]) { entry[0] };
                dict.Add(newEntry);
                if (dict.Count == (1 << codeSize) && codeSize < 12)
                    codeSize++;
            }

            oldCode = code;
        }

        return decodedPixels;
    }

    private static List<int> DecompressRle(byte[] uint8Data, int dataPtr, int validPixelCount)
    {
        var decodedPixels = new List<int>(validPixelCount);
        var ptr = dataPtr;
        while (decodedPixels.Count < validPixelCount && ptr < uint8Data.Length - 1)
        {
            var value = uint8Data[ptr++];
            var count = uint8Data[ptr++];
            for (var i = 0; i < count && decodedPixels.Count < validPixelCount; i++)
                decodedPixels.Add(value);
        }

        return decodedPixels;
    }

    private static List<int> DecompressNone(byte[] uint8Data, int dataPtr, int validPixelCount)
    {
        var decodedPixels = new List<int>(validPixelCount);
        var ptr = dataPtr;
        while (decodedPixels.Count < validPixelCount && ptr < uint8Data.Length)
            decodedPixels.Add(uint8Data[ptr++]);
        return decodedPixels;
    }
}
