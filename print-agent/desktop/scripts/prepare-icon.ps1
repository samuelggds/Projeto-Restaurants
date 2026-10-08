# Builds the Windows icon from the exact official GX artwork already in the web app.
# The official SVG removes the white matte with a luminance-to-alpha filter;
# this script reproduces that filter so the installer gets a transparent PNG.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot '../../../frontend/public/gastronexa-logo.png')
)
$destination = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot '../assets/gastronexa-icon-512.png')
)
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw 'Official GastroNexa artwork was not found.'
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
$mark = $null
$target = $null
$graphics = $null
try {
  $mark = [System.Drawing.Bitmap]::new(
    $source.Width, $source.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $pixel = $source.GetPixel($x, $y)
      $luminance = 0.2126 * $pixel.R + 0.7152 * $pixel.G + 0.0722 * $pixel.B
      $alpha = [int][Math]::Round(
        [Math]::Max(0, [Math]::Min(255, (255 - $luminance) * $pixel.A / 255))
      )
      $mark.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 17, 17, 17))
    }
  }

  $target = [System.Drawing.Bitmap]::new(
    512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  $scale = [Math]::Min(440.0 / $source.Width, 440.0 / $source.Height)
  $drawWidth = [int][Math]::Round($source.Width * $scale)
  $drawHeight = [int][Math]::Round($source.Height * $scale)
  $offsetX = [int][Math]::Floor((512 - $drawWidth) / 2)
  $offsetY = [int][Math]::Floor((512 - $drawHeight) / 2)
  $graphics.DrawImage($mark, $offsetX, $offsetY, $drawWidth, $drawHeight)

  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destination)) | Out-Null
  $graphics.Flush()
  $target.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host 'Generated official 512x512 GastroNexa Windows icon.'
}
finally {
  if ($null -ne $graphics) { $graphics.Dispose() }
  if ($null -ne $target) { $target.Dispose() }
  if ($null -ne $mark) { $mark.Dispose() }
  $source.Dispose()
}
