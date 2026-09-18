using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using SharpShell.Attributes;
using SharpShell.SharpThumbnailHandler;

namespace InkPreviewHandler;

/// <summary>
/// Explorer-Thumbnails bei „Große Symbole“ / Kachelansicht (IThumbnailProvider).
/// </summary>
[ComVisible(true)]
[Guid("b1c2d3e4-f5a6-4789-a012-3456789abcde")]
[RegistrationName("InkShell.InkThumbnailHandler")]
[DisplayName("INK E-Paper Miniaturansicht")]
[COMServerAssociation(AssociationType.ClassOfExtension, ".ink")]
[COMServerAssociation(AssociationType.Class, "ink.1")]
public class InkThumbnailHandler : SharpThumbnailHandler
{
    protected override Bitmap GetThumbnailImage(uint width)
    {
        if (SelectedItemStream == null) return null!;

        try
        {
            var bytes = TryReadEntireStream();
            if (bytes == null || bytes.Length < 4)
                bytes = TryReadFromStreamFilePath();
            if (bytes == null || bytes.Length < 4)
                return null!;

            using var decoded = InkDecoder.Decode(bytes);
            var max = (int)Math.Max(32, Math.Min(width, 512));
            return ComposeSquareThumbnail(decoded, max);
        }
        catch
        {
            return null!;
        }
    }

    /// <summary>
    /// Shell-IStream von Anfang lesen (Position=0 reicht nicht, wenn Seek nötig ist).
    /// </summary>
    private byte[]? TryReadEntireStream()
    {
        try
        {
            if (SelectedItemStream.CanSeek)
                SelectedItemStream.Seek(0, SeekOrigin.Begin);
        }
        catch
        {
            try
            {
                SelectedItemStream.Position = 0;
            }
            catch
            {
                /* ignorieren */
            }
        }

        using var ms = new MemoryStream();
        var buf = new byte[65536];
        int n;
        while ((n = SelectedItemStream.Read(buf, 0, buf.Length)) > 0)
            ms.Write(buf, 0, n);
        return ms.ToArray();
    }

    /// <summary>
    /// Wenn der Stream leer oder unbrauchbar ist, liefert IStream::Stat mitunter einen Pfad.
    /// </summary>
    private byte[]? TryReadFromStreamFilePath()
    {
        try
        {
            var name = SelectedItemStream.Name;
            if (string.IsNullOrWhiteSpace(name)) return null;
            if (name.IndexOfAny(Path.GetInvalidPathChars()) >= 0) return null;
            if (!File.Exists(name)) return null;
            return File.ReadAllBytes(name);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Quadratische Miniatur (maxSide×maxSide), Bild proportional eingepasst und zentriert — wie bei den meisten Shell-Thumbnails,
    /// statt hoher Portrait-Rechtecke bei Hochkant-.ink.
    /// </summary>
    private static Bitmap ComposeSquareThumbnail(Bitmap source, int maxSide)
    {
        var w = source.Width;
        var h = source.Height;
        if (w <= 0 || h <= 0) return new Bitmap(1, 1, PixelFormat.Format32bppArgb);

        var scale = Math.Min((double)maxSide / w, (double)maxSide / h);
        var nw = Math.Max(1, (int)Math.Round(w * scale));
        var nh = Math.Max(1, (int)Math.Round(h * scale));

        var dest = new Bitmap(maxSide, maxSide, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(dest))
        {
            g.Clear(Color.FromArgb(45, 45, 48));
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            var x = (maxSide - nw) / 2;
            var y = (maxSide - nh) / 2;
            g.DrawImage(source, x, y, nw, nh);
        }

        return dest;
    }
}
