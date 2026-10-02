# Resize a photo for the website: longest side <= MaxSide, JPEG quality 85,
# honoring EXIF orientation (phone photos otherwise come out sideways).
# Only downscales. Handles Chinese filenames.
#
#   powershell -File tools/resize-photo.ps1 -In "..\news\2026.9.26 - hiking.jpg" -Out assets/img/news/lab-hike-2026-a.jpg
#   powershell -File tools/resize-photo.ps1 -In "..\member\马莉雅.jpg" -Out assets/img/people/liya-ma.jpg -MaxSide 1200
param(
  [Parameter(Mandatory)][string]$In,
  [Parameter(Mandatory)][string]$Out,
  [int]$MaxSide = 1600,
  [long]$Quality = 85
)
Add-Type -AssemblyName System.Drawing
$In  = (Resolve-Path $In).Path
if (-not [IO.Path]::IsPathRooted($Out)) { $Out = Join-Path (Get-Location) $Out }
$Out = [IO.Path]::GetFullPath($Out)
$rot = @{2='RotateNoneFlipX';3='Rotate180FlipNone';4='Rotate180FlipX';5='Rotate90FlipX';6='Rotate90FlipNone';7='Rotate270FlipX';8='Rotate270FlipNone'}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
$img = [System.Drawing.Image]::FromFile($In)
try {
  if ($img.PropertyIdList -contains 274) {
    $o = [int]$img.GetPropertyItem(274).Value[0]
    if ($rot.ContainsKey($o)) { $img.RotateFlip([System.Drawing.RotateFlipType]$rot[$o]) }
  }
  $s  = [Math]::Min([Math]::Min($MaxSide / $img.Width, $MaxSide / $img.Height), 1.0)
  $nw = [int]($img.Width * $s); $nh = [int]($img.Height * $s)
  $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $bmp.Save($Out, $codec, $ep)
  $g.Dispose(); $bmp.Dispose()
} finally { $img.Dispose() }
"{0} -> {1}x{2}, {3:N0} KB" -f (Split-Path $Out -Leaf), $nw, $nh, ((Get-Item $Out).Length / 1KB)
