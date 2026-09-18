using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace InkPreviewHandler;

/// <summary>
/// Zeigt .ink per eingebettetem Decoder (kein Node.js).
/// </summary>
internal sealed class InkPreviewControl : SharpShell.SharpPreviewHandler.PreviewHandlerControl
{
    private readonly string _inkPath;
    private PictureBox? _picture;
    private Label? _message;

    public InkPreviewControl(string inkPath)
    {
        _inkPath = inkPath ?? "";
    }

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        BackColor = Color.FromArgb(32, 32, 32);
        _picture = new PictureBox
        {
            Dock = DockStyle.Fill,
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = BackColor
        };
        _message = new Label
        {
            Dock = DockStyle.Fill,
            ForeColor = Color.Gainsboro,
            BackColor = BackColor,
            TextAlign = ContentAlignment.TopLeft,
            Padding = new Padding(12),
            Font = new Font(FontFamily.GenericSansSerif, 9f),
            AutoSize = false
        };
        Controls.Add(_picture);
        Controls.Add(_message);
        _message.BringToFront();
        _message.Visible = true;
        _picture.Visible = false;

        try
        {
            LoadPreview();
        }
        catch (Exception ex)
        {
            ShowError(ex.Message);
        }
    }

    private void ShowError(string text)
    {
        if (_message == null) return;
        _message.Text = text;
        _message.Visible = true;
        if (_picture != null) _picture.Visible = false;
    }

    private void LoadPreview()
    {
        if (string.IsNullOrWhiteSpace(_inkPath))
        {
            ShowError("Kein Dateipfad von der Shell übergeben (Vorschau nur mit Dateizugriff möglich).");
            return;
        }

        if (!File.Exists(_inkPath))
        {
            ShowError("Datei nicht gefunden: " + _inkPath);
            return;
        }

        byte[] data;
        try
        {
            data = InkDecoder.ReadAllBytesAllowingShare(_inkPath);
        }
        catch (Exception ex)
        {
            ShowError("Lesen fehlgeschlagen: " + ex.Message);
            return;
        }

        if (data.Length < 4)
        {
            ShowError(".ink-Datei zu kurz.");
            return;
        }

        using var bmp = InkDecoder.Decode(data);
        if (_picture != null)
        {
            _picture.Image = new Bitmap(bmp);
            _picture.Visible = true;
            _picture.BringToFront();
        }

        if (_message != null) _message.Visible = false;
    }
}
