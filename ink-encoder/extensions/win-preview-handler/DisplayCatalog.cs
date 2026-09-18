using System.Collections.Generic;
using System.Drawing;

namespace InkPreviewHandler;

/// <summary>
/// Display-Metadaten wie in ink-encoder / microPhotoFrame EInkDef (Header-Byte = ein ASCII-Zeichen).
/// </summary>
internal readonly struct DisplayDef
{
    public int Width { get; }
    public int Height { get; }
    public bool IsRound { get; }
    public Color[] Palette { get; }

    public DisplayDef(int width, int height, bool isRound, Color[] palette)
    {
        Width = width;
        Height = height;
        IsRound = isRound;
        Palette = palette;
    }
}

internal static class DisplayCatalog
{
    private static readonly Dictionary<char, DisplayDef> ById = Build();

    private static Color[] P(string[] hex) => System.Array.ConvertAll(hex, HexToColor);

    private static Color HexToColor(string hex)
    {
        var s = hex.TrimStart('#');
        if (s.Length == 3)
            s = $"{s[0]}{s[0]}{s[1]}{s[1]}{s[2]}{s[2]}";
        var v = System.Convert.ToInt32(s, 16);
        return Color.FromArgb(255, (v >> 16) & 255, (v >> 8) & 255, v & 255);
    }

    private static Dictionary<char, DisplayDef> Build()
    {
        var bw = new[] { "#FFFFFF", "#000000" };
        var gray4 = new[] { "#FFFFFF", "#AAAAAA", "#555555", "#000000" };
        var bwr = new[] { "#FFFFFF", "#000000", "#FF0000" };
        var bwy = new[] { "#FFFFFF", "#000000", "#FFFF00" };
        var e6 = new[] { "#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00" };
        var bwry = new[] { "#000000", "#FFFFFF", "#FF0000", "#FFFF00" };

        return new Dictionary<char, DisplayDef>
        {
            ['0'] = new DisplayDef(200, 200, false, P(bw)),
            ['1'] = new DisplayDef(250, 122, false, P(bw)),
            ['2'] = new DisplayDef(296, 128, false, P(bw)),
            ['3'] = new DisplayDef(400, 300, false, P(bw)),
            ['4'] = new DisplayDef(648, 480, false, P(bw)),
            ['5'] = new DisplayDef(800, 480, false, P(bw)),
            ['6'] = new DisplayDef(1872, 1404, false, P(bw)),
            ['7'] = new DisplayDef(2200, 1650, false, P(bw)),
            ['A'] = new DisplayDef(250, 122, false, P(gray4)),
            ['B'] = new DisplayDef(800, 480, false, P(gray4)),
            ['C'] = new DisplayDef(400, 300, false, P(gray4)),
            ['D'] = new DisplayDef(800, 480, false, P(gray4)),
            ['E'] = new DisplayDef(1872, 1404, false, P(gray4)),
            ['G'] = new DisplayDef(400, 400, true, P(e6)),
            ['H'] = new DisplayDef(600, 400, false, P(e6)),
            ['I'] = new DisplayDef(800, 480, false, P(e6)),
            ['J'] = new DisplayDef(1024, 576, false, P(e6)),
            ['K'] = new DisplayDef(1600, 1200, false, P(e6)),
            ['L'] = new DisplayDef(3200, 1800, false, P(e6)),
            ['M'] = new DisplayDef(2160, 3060, false, P(e6)),
            ['N'] = new DisplayDef(2560, 1440, false, P(e6)),
            ['O'] = new DisplayDef(2560, 1440, false, P(e6)),
            ['P'] = new DisplayDef(3840, 2160, false, P(e6)),
            ['Q'] = new DisplayDef(200, 200, false, P(bwr)),
            ['R'] = new DisplayDef(250, 122, false, P(bwr)),
            ['S'] = new DisplayDef(264, 176, false, P(bwr)),
            ['T'] = new DisplayDef(296, 128, false, P(bwr)),
            ['U'] = new DisplayDef(400, 300, false, P(bwr)),
            ['V'] = new DisplayDef(648, 480, false, P(bwr)),
            ['W'] = new DisplayDef(800, 480, false, P(bwr)),
            ['X'] = new DisplayDef(250, 122, false, P(bwy)),
            ['Y'] = new DisplayDef(1304, 984, false, P(bwr)),
            ['a'] = new DisplayDef(212, 104, false, P(bwry)),
            ['b'] = new DisplayDef(296, 152, false, P(bwry)),
            ['c'] = new DisplayDef(400, 168, false, P(bwry)),
            ['d'] = new DisplayDef(400, 300, false, P(bwry)),
            ['e'] = new DisplayDef(800, 480, false, P(bwry))
        };
    }

    public static bool TryGet(char displayId, out DisplayDef def) =>
        ById.TryGetValue(displayId, out def);
}
