# tools/probe-pages.ps1
#
# Read-only pagination probe. Opens each generated .docx via Word COM with
# ReadOnly=$true and AddToRecentFiles=$false (so it creates no ~$ lock file
# and leaves no MRU trace), reports page/word/table/section/shape counts,
# and dumps Word's own text extraction to dist\<name>-word-extracted.txt so
# it can be diffed against the shipped .txt as a second, independent
# extraction (build-docx.js and build-txt.js share model.js, so a bug in
# that shared assumption wouldn't show up in their own comparison alone).
#
# Usage: powershell -File tools/probe-pages.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'

$files = Get-ChildItem -Path $dist -Filter '*.docx'
if (-not $files) { Write-Host "No .docx files found in $dist"; exit 1 }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

$exitCode = 0

foreach ($f in $files) {
  Write-Host "=== $($f.Name) ==="
  try {
    $doc = $word.Documents.Open($f.FullName, $false, $true, $false)  # ConfirmConversions, ReadOnly, AddToRecentFiles
    $pages    = $doc.ComputeStatistics(2)   # wdStatisticPages
    $words    = $doc.ComputeStatistics(0)   # wdStatisticWords
    $tables   = $doc.Tables.Count
    $sections = $doc.Sections.Count
    $shapes   = $doc.Shapes.Count
    $inline   = $doc.InlineShapes.Count
    $headers  = @($doc.Sections | ForEach-Object { $_.Headers } | Where-Object { $_.Exists }).Count

    Write-Host "  pages=$pages words=$words tables=$tables sections=$sections shapes=$shapes inline=$inline headers=$headers"

    if ($pages -gt 2) { Write-Host "  FAIL: pages > 2"; $exitCode = 1 } else { Write-Host "  PASS: pages <= 2" }
    if ($tables -ne 0) { Write-Host "  FAIL: tables != 0"; $exitCode = 1 } else { Write-Host "  PASS: tables == 0" }
    if ($sections -ne 1) { Write-Host "  FAIL: sections != 1"; $exitCode = 1 } else { Write-Host "  PASS: sections == 1" }
    if (($shapes + $inline) -ne 0) { Write-Host "  FAIL: shapes+inline != 0"; $exitCode = 1 } else { Write-Host "  PASS: shapes+inline == 0" }
    # NOTE: Word's COM object model instantiates an empty Headers object the
    # moment it's accessed, so .Exists commonly reports True here even when
    # the underlying .docx has zero header/footer XML parts (verify-docx.sh
    # checks the real zip contents directly and is authoritative). Informational only.
    Write-Host "  INFO: headers reported by Word COM = $headers (verify-docx.sh checks the real zip parts)"

    $extractedPath = Join-Path $dist ($f.BaseName + '-word-extracted.txt')
    $doc.Content.Text | Set-Content -Encoding utf8 $extractedPath
    Write-Host "  wrote $extractedPath"

    $doc.Close($false)
    [Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
  } catch {
    Write-Host "  ERROR opening $($f.Name): $_"
    $exitCode = 1
  }
}

$word.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

exit $exitCode
