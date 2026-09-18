using System;
using System.Runtime.InteropServices;
using SharpShell.Attributes;
using SharpShell.SharpPreviewHandler;

namespace InkPreviewHandler;

/// <summary>
/// Explorer-Vorschaufenster für .ink (eingebetteter Decoder).
/// </summary>
[ComVisible(true)]
[Guid("8c4e2f91-0b3a-4d7e-9f12-6a5e8c3d1b07")]
[RegistrationName("InkShell.InkPreviewHandler")]
[DisplayName("INK E-Paper Vorschau")]
[COMServerAssociation(AssociationType.ClassOfExtension, ".ink")]
[COMServerAssociation(AssociationType.Class, "ink.1")]
[PreviewHandler(DisableLowILProcessIsolation = true)]
public class InkShellPreviewHandler : SharpPreviewHandler
{
    protected override PreviewHandlerControl DoPreview()
    {
        return new InkPreviewControl(SelectedFilePath);
    }
}
