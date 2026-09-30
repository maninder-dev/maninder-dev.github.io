#!/usr/bin/env bash
# tools/verify-docx.sh <file.docx> <file.txt>
#
# Re-unzips a generated resume and asserts it is ATS-parseable: no table,
# text box, image, columns, header/footer or <w:br/>; tabs only on the
# right-aligned date of job/education headers; real heading styles and
# numPr bullets; https links; no banned punctuation; standard section
# headings; one dated record per job; well-formed skills lines; no
# leftover placeholders; a 10pt font floor; and that the text stream a
# naive parser reads from document.xml matches the shipped .txt.
set -u
D="${1:?usage: verify-docx.sh <file.docx> <file.txt>}"
T="${2:?usage: verify-docx.sh <file.docx> <file.txt>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# Windows node can't resolve Git Bash's /c/... paths.
command -v cygpath >/dev/null 2>&1 && HERE="$(cygpath -m "$HERE")"
fail=0

ck(){ if [ "$2" = "$3" ]; then echo "PASS  $1 ($2)"; else echo "FAIL  $1: got '$2' want '$3'"; fail=1; fi; }
ge(){ if [ "$2" -ge "$3" ]; then echo "PASS  $1 ($2>=$3)"; else echo "FAIL  $1: got $2 want >=$3"; fail=1; fi; }
n(){ printf '%s' "$1" | grep -o "$2" 2>/dev/null | wc -l | tr -d ' '; }

echo "=== verifying $D ==="

# --- package ---
unzip -t "$D" >/dev/null 2>&1 && echo "PASS  zip integrity" || { echo "FAIL  zip integrity"; fail=1; }
ck "no header/footer parts" "$(unzip -l "$D" | grep -cE 'word/(header|footer)[0-9]')" 0
ck "no media parts"         "$(unzip -l "$D" | grep -c 'word/media/')" 0

X=$(unzip -p "$D" word/document.xml)
STY=$(unzip -p "$D" word/styles.xml)

# --- structural bans ---
ck "no tables"            "$(n "$X" '<w:tbl>')" 0
ck "no line breaks"       "$(n "$X" '<w:br')" 0
ck "no text boxes"        "$(n "$X" '<w:txbxContent')" 0
ck "no images"            "$(n "$X" '<w:drawing\|<w:pict')" 0
ck "no field codes"       "$(n "$X" '<w:fldChar\|<w:instrText')" 0
ck "no multi-column"      "$(n "$X" '<w:cols[^>]*w:num=')" 0

# Tabs: exactly one per dated header line (3 jobs + 1 education), none elsewhere.
EXPECTED_TABS=$(node -e "const {CV}=require('$HERE/../cv-data.js'); console.log(CV.experience.filter(j => !(CV.atsProfile.hideJobs||[]).includes(j.company)).length + CV.education.filter(e => e.gradYear).length)")
ck "tabs only on dated headers" "$(n "$X" '<w:tab/>')" "$EXPECTED_TABS"

# --- headings, bullets, links ---
ge "Heading2 section headings" "$(n "$X" 'w:val="Heading2"')" 5
ge "outlineLvl present" "$(( $(n "$STY" '<w:outlineLvl') + $(n "$X" '<w:outlineLvl') ))" 5
ge "numPr bullets" "$(n "$X" '<w:numPr>')" 10
ge "hyperlinks" "$(n "$X" '<w:hyperlink')" 2
ck "no http:// rel targets" "$(n "$(unzip -p "$D" word/_rels/document.xml.rels)" 'Target="http://')" 0

# ===== text stream as a naive parser sees it: only </w:p> makes a newline =====
TXT=$(printf '%s' "$X" | sed 's|</w:p>|\n|g; s|<[^>]*>||g' \
      | sed 's|&amp;|\&|g; s|&lt;|<|g; s|&gt;|>|g; s|&quot;|"|g; s|&#39;|'"'"'|g; s|&apos;|'"'"'|g')

ck "no MIDDLE DOT"   "$(n "$TXT" $'\xc2\xb7')" 0
ck "no EM DASH"      "$(n "$TXT" $'\xe2\x80\x94')" 0
ck "no EN DASH"      "$(n "$TXT" $'\xe2\x80\x93')" 0
ck "no NBSP"         "$(n "$TXT" $'\xc2\xa0')" 0
ck "no curly quotes" "$(n "$TXT" $'\xe2\x80\x98\|\xe2\x80\x99\|\xe2\x80\x9c\|\xe2\x80\x9d')" 0
ck "no literal bullet glyphs in text" "$(n "$TXT" $'\xe2\x80\xa2\|\xef\x82\xb7')" 0
ck "no leftover placeholders" "$(printf '%s' "$TXT" | grep -cE '\[N\]|\[[A-Z ]{3,}|<handle>')" 0

for h in "Summary" "Technical Skills" "Work Experience" "Projects" "Education"; do
  printf '%s' "$TXT" | grep -qx "$h" && echo "PASS  heading '$h'" \
    || { echo "FAIL  heading '$h' absent or not alone on its line"; fail=1; }
done

JOBS=$(node -e "const {CV}=require('$HERE/../cv-data.js'); console.log(CV.experience.filter(j => !(CV.atsProfile.hideJobs||[]).includes(j.company)).length)")
# --- dates: title and range on one line, separated by whitespace even with the tab dropped ---
M='(January|February|March|April|May|June|July|August|September|October|November|December)'
ck "dated job lines" "$(printf '%s' "$TXT" | grep -cE "^[A-Z][A-Za-z ]+ +$M [0-9]{4} - ($M [0-9]{4}|Present)$")" "$JOBS"
ck "exactly one 'Present'" "$(printf '%s' "$TXT" | grep -c 'Present')" 1
printf '%s' "$TXT" | grep -qE "^Senior Software Engineer +$M [0-9]{4} - Present$" \
  && echo "PASS  current role line" || { echo "FAIL  current role line"; fail=1; }
printf '%s' "$TXT" | grep -qE "^Bachelor of [A-Za-z ]+( +(19|20)[0-9]{2})?$" \
  && echo "PASS  degree line" || { echo "FAIL  degree line"; fail=1; }
printf '%s' "$TXT" | grep -qE "^Doaba College \(Guru Nanak Dev University\), " \
  && echo "PASS  institution line" || { echo "FAIL  institution line"; fail=1; }

# A dropped separator merges words ('PunjabGuru'). Legit camelCase names are stripped first.
KNOWN='WordPress|JavaScript|TypeScript|WooCommerce|PrestaShop|OpenCart|BeanStream|InfusionSoft|cPanel|eCommerce|jQuery|GraphQL|ReactJS|MongoDB|MariaDB|PostgreSQL|GitHub|GitLab|PayPal|mWISE|XcooBee|MissionalAgents|eSolutions|mooTree|InfusionSoft|ReactNative'
ck "no unexplained word merge" "$(n "$(printf '%s' "$TXT" | sed -E "s/$KNOWN//g")" '[a-z][A-Z][a-z]\{3,\}')" 0

# --- skills: every group in cv-data.js appears as 'Label: a, b, c' ---
while IFS= read -r g; do
  printf '%s' "$TXT" | grep -qE "^$g: [^,]+(, [^,]+)+$" && echo "PASS  skills '$g'" \
    || { echo "FAIL  skills '$g' missing or malformed"; fail=1; }
done < <(node -e "require('$HERE/../cv-data.js').CV.skills.forEach(g=>console.log(g.group))")

for k in "Shopware 6" "Symfony" "Laravel" "React.js" "Angular" "TypeScript" "AWS (Amazon Web Services)" \
         "Stripe" "MySQL" "Doctrine ORM" "GraphQL" "Node.js"; do
  esc=$(printf '%s' "$k" | sed 's/[.[\*^$()+?{|]/\\&/g')
  printf '%s' "$TXT" | grep -qE "(: |, )$esc(,|$)" && echo "PASS  token '$k'" \
    || { echo "FAIL  '$k' is not a delimited skill token"; fail=1; }
done

W=$(printf '%s' "$TXT" | wc -w | tr -d ' ')
BUDGET=$(node -e "console.log(require('$HERE/../cv-data.js').CV.atsProfile.wordBudget)")
if [ "$W" -le "$BUDGET" ]; then echo "PASS  word count $W <= $BUDGET"; else echo "FAIL  word count $W > $BUDGET"; fail=1; fi
ck "no runs below 10pt" "$(printf '%s' "$X" | grep -o 'w:sz w:val="[0-9]*"' | grep -oE '[0-9]+' | awk '$1<20{c++} END{print c+0}')" 0

# --- fidelity: docx text stream == shipped .txt (whitespace-normalized) ---
norm(){ sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//' | grep -v '^$'; }
diff <(printf '%s\n' "$TXT" | norm) <(norm < "$T") \
  && echo "PASS  docx text stream == txt" || { echo "FAIL  docx/txt divergence"; fail=1; }

echo "=== $([ $fail -eq 0 ] && echo ALL PASS || echo SOME FAILED) ==="
exit $fail
