# tools/export-pdf.ps1
#
# Exports every latestCV\*.docx to a PDF beside it via Word, and reports the
# page count. Opens each file read-only without adding it to recent files.
# A Word-native PDF keeps a real, in-order text layer, so it parses as well as
# the .docx does.
#
# Usage: powershell -File tools/export-pdf.ps1

$ErrorActionPreference = 'Stop'
$latestCV = Join-Path (Split-Path -Parent $PSScriptRoot) 'latestCV'
$files = Get-ChildItem -Path $latestCV -Filter '*.docx' | Where-Object { $_.Name -notlike '~$*' }
if (-not $files) { Write-Host "No .docx files in $latestCV"; exit 1 }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$exitCode = 0
$maxPages = [int](node -e "console.log(require('$($PSScriptRoot -replace '\\','/')/../cv-data.js').CV.atsProfile.targetPages)")

foreach ($f in $files) {
  try {
    $doc = $word.Documents.Open($f.FullName, $false, $true, $false)
    $pages = $doc.ComputeStatistics(2)
    $pdf = [IO.Path]::ChangeExtension($f.FullName, '.pdf')
    $doc.ExportAsFixedFormat($pdf, 17)   # wdExportFormatPDF
    $doc.Close($false)
    [Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    $flag = if ($pages -gt $maxPages) { "OVER $maxPages PAGES" } else { 'ok' }
    Write-Host "$($f.BaseName).pdf  pages=$pages  $flag"
    if ($pages -gt $maxPages) { $exitCode = 1 }
  } catch {
    Write-Host "ERROR $($f.Name): $_"
    $exitCode = 1
  }
}

$word.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
exit $exitCode
