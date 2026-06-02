# Optimise les images de badges : redimensionne chaque PNG de public/badges/
# a 256 px max (cote le plus long), en conservant la transparence.
# A relancer apres avoir depose de nouveaux badges :  ./scripts/optimize-badges.ps1
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot "..\public\badges"
$max = 256
if (-not (Test-Path $dir)) { Write-Output "Dossier introuvable : $dir"; return }
Get-ChildItem $dir -Filter *.png | ForEach-Object {
  $f = $_.FullName
  $bytes = [System.IO.File]::ReadAllBytes($f)
  $ms = New-Object System.IO.MemoryStream(,$bytes)
  $img = [System.Drawing.Image]::FromStream($ms)
  $ow = $img.Width; $oh = $img.Height
  $ratio = [Math]::Min($max/$ow, $max/$oh)
  if ($ratio -lt 1) {
    $nw = [int][Math]::Round($ow*$ratio); $nh = [int][Math]::Round($oh*$ratio)
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $g.Dispose(); $img.Dispose(); $ms.Dispose()
    $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    "{0}: {1}x{2} -> {3}x{4}  ({5} Ko)" -f $_.Name, $ow, $oh, $nw, $nh, [Math]::Round((Get-Item $f).Length/1KB)
  } else { $img.Dispose(); $ms.Dispose(); "{0}: deja <= {1}px, ignore" -f $_.Name, $max }
}
