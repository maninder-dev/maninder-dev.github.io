#!/usr/bin/env bash
# tools/verify-docx.sh <path-to.docx> <path-to.txt>
#
# Re-unzips the generated .docx and asserts it is ATS-parseable: no table,
# no <w:br/>, no <w:tab/>, real heading styles, real numPr bullets, https
# hyperlinks only, no banned Unicode punctuation, the 5 required headings
# present and the 5 legacy headings absent, 3 dated job records, a grad
# year, no PunjabGuru-class merge, 12 well-formed skills lines, key
# technology tokens present as delimited skills, no runs below 10pt, a
# 2-page-viable word count, and — the real proof — that the text stream
# extracted from document.xml is identical to the shipped .txt.
set -u
D="${1:?usage: verify-docx.sh <file.docx> <file.txt>}"
T="${2:?usage: verify-docx.sh <file.docx> <file.txt>}"
fail=0

ck(){ if [ "$2" = "$3" ]; then echo "PASS  $1 ($2)"; else echo "FAIL  $1: got '$2' want '$3'"; fail=1; fi; }
ge(){ if [ "$2" -ge "$3" ]; then echo "PASS  $1 ($2>=$3)"; else echo "FAIL  $1: got $2 want >=$3"; fail=1; fi; }
n(){ printf '%s' "$1" | grep -o "$2" 2>/dev/null | wc -l | tr -d ' '; }

echo "=== verifying $D ==="

# --- 0. valid zip, expected parts ---
unzip -t "$D" >/dev/null 2>&1 && echo "PASS  zip integrity" || { echo "FAIL  zip integrity"; fail=1; }
for p in 'Content_Types' 'word/document.xml' 'word/styles.xml' 'word/numbering.xml' 'word/_rels/document.xml.rels'; do
  unzip -l "$D" | grep -q "$p" && echo "PASS  part $p" || { echo "FAIL  missing $p"; fail=1; }
done
ck "no header/footer parts" "$(unzip -l "$D" | grep -cE 'word/(header|footer)[0-9]')" 0
ck "no media parts"         "$(unzip -l "$D" | grep -c 'word/media/')" 0

X=$(unzip -p "$D" word/document.xml)

# --- 1. structural bans ---
ck "no tables"            "$(n "$X" '<w:tbl>')" 0
ck "no line breaks"       "$(n "$X" '<w:br')" 0
ck "no text boxes"        "$(n "$X" '<w:txbxContent')" 0
ck "no images"            "$(n "$X" '<w:drawing\|<w:pict')" 0
ck "no field codes"       "$(n "$X" '<w:fldChar\|<w:instrText')" 0
ck "no content controls"  "$(n "$X" '<w:sdt>')" 0
ck "no tabs in text"      "$(n "$X" '<w:tab/>')" 0
ck "no multi-column"      "$(n "$X" '<w:cols[^>]*w:num=')" 0
ck "no NormalWeb style"   "$(n "$X" 'w:val=\"NormalWeb\"')" 0

# --- 2. real heading styles with outline levels ---
ge "Heading2 count (references)" "$(n "$X" 'w:val=\"Heading2\"')" 1
STY=$(unzip -p "$D" word/styles.xml)
# outlineLvl can live in styles.xml OR as a per-paragraph override in
# document.xml (docx's default heading styles use the latter — see
# build-docx.js's outlineLevel option). Either location is a real signal.
OUTLINE_TOTAL=$(( $(n "$STY" '<w:outlineLvl') + $(n "$X" '<w:outlineLvl') ))
ge "outlineLvl (styles.xml + document.xml)" "$OUTLINE_TOTAL" 2

# --- 3. real numPr bullets, glyph NOT in the text stream ---
ge "numPr bullets" "$(n "$X" '<w:numPr>')" 8
ck "no literal bullet glyphs in text" "$(n "$X" $'\xe2\x80\xa2\|\xef\x82\xb7\|\xe2\x97\x8f\|\xe2\x96\xa0')" 0

# --- 4. real hyperlinks, https only ---
ge "w:hyperlink" "$(n "$X" '<w:hyperlink')" 1
if unzip -l "$D" | grep -q 'word/_rels/document.xml.rels'; then
  ck "no http:// rel targets" "$(n "$(unzip -p "$D" word/_rels/document.xml.rels)" 'Target=\"http://')" 0
fi

# ================= THE TEXT STREAM AS A NAIVE PARSER SEES IT =================
# ONLY </w:p> becomes a newline. Nothing else — this is the PunjabGuru test:
# if any content relied on <w:br> or a table cell boundary, it merges here.
TXT=$(printf '%s' "$X" | sed 's|</w:p>|\n|g; s|<[^>]*>||g' \
      | sed 's|&amp;|\&|g; s|&lt;|<|g; s|&gt;|>|g; s|&quot;|"|g; s|&#39;|'"'"'|g; s|&apos;|'"'"'|g')

# --- 5. banned characters in visible text ---
ck "no MIDDLE DOT U+00B7"  "$(n "$TXT" $'\xc2\xb7')" 0
ck "no EM DASH U+2014"     "$(n "$TXT" $'\xe2\x80\x94')" 0
ck "no EN DASH U+2013"     "$(n "$TXT" $'\xe2\x80\x93')" 0
ck "no NBSP U+00A0"        "$(n "$TXT" $'\xc2\xa0')" 0
ck "no curly quotes"       "$(n "$TXT" $'\xe2\x80\x98\|\xe2\x80\x99\|\xe2\x80\x9c\|\xe2\x80\x9d')" 0

# --- 6. exact heading strings, each alone on its own line ---
for h in "Professional Summary" "Technical Skills" "Professional Experience" "Projects" "Education"; do
  printf '%s' "$TXT" | grep -qx "$h" && echo "PASS  heading '$h'" \
    || { echo "FAIL  heading '$h' absent or not alone on its line"; fail=1; }
done
for h in "Professional expertise" "Skills & abilities" "Selected projects" "Additional sites" "Management & leadership"; do
  printf '%s' "$TXT" | grep -qi "$h" && { echo "FAIL  legacy heading '$h' still present"; fail=1; } \
    || echo "PASS  legacy heading '$h' removed"
done

# --- 7. DATES ---
M='(January|February|March|April|May|June|July|August|September|October|November|December)'
ck "date ranges (one per job)" "$(printf '%s' "$TXT" | grep -cE "$M [0-9]{4} - ($M [0-9]{4}|Present)")" 3
ck "exactly one 'Present'"     "$(printf '%s' "$TXT" | grep -c 'Present')" 1
printf '%s' "$TXT" | grep -qE "^Senior Software Engineer, [^|]+, [^|]+ \| $M [0-9]{4} - Present$" \
  && echo "PASS  employer line binds title/company/location/dates" \
  || { echo "FAIL  employer line shape"; fail=1; }
printf '%s' "$TXT" | grep -qE 'Guru Nanak Dev University\).*\| (19|20)[0-9]{2}$' \
  && echo "PASS  grad year on education line" || { echo "FAIL  grad year missing"; fail=1; }
# The PunjabGuru bug (cv/Maninder Singh - Combined CV 2026.docx) was a
# <w:br/> that a naive extractor drops, silently joining two words with no
# separator. <w:br/> is already banned structurally above, so this bug class
# is already impossible here — this check is a second, independent net.
# A blanket camelCase regex is unusable on its own: this resume legitimately
# contains WordPress, JavaScript, TypeScript, WooCommerce, PrestaShop,
# OpenCart, BeanStream, InfusionSoft, cPanel, eCommerce, jQuery and mooTree,
# all of which match "lowercase-then-uppercase-then-3+lowercase". Strip the
# known-legitimate tokens first, so a genuine merge (an unknown, undelimited
# join) still gets caught.
KNOWN_CAMELCASE='WordPress|JavaScript|TypeScript|WooCommerce|PrestaShop|OpenCart|BeanStream|InfusionSoft|cPanel|eCommerce|jQuery|mooTree|GraphQL|ReactJS'
STRIPPED=$(printf '%s' "$TXT" | sed -E "s/$KNOWN_CAMELCASE//g")
ck "no unexplained camelCase merge" "$(n "$STRIPPED" '[a-z][A-Z][a-z]\{3,\}')" 0

# --- 8. skills lines are 'Label: a, b, c' outside any table ---
for g in "Programming Languages" "PHP Frameworks" "Ecommerce Platforms" "Content Management Systems" \
         "Frontend" "Backend and APIs" "Databases" "Cloud and Infrastructure" "Payments" \
         "Tools and Practices" "Industries" "Leadership"; do
  printf '%s' "$TXT" | grep -qE "^$g: [^,]+(, [^,]+)+$" && echo "PASS  skills line '$g'" \
    || { echo "FAIL  skills line '$g' missing or malformed"; fail=1; }
done

# --- 9. high-value keywords exist as comma-delimited tokens, not just buried in prose ---
for k in "Shopware 6" "Symfony 5" "React.js" "TypeScript" "AWS (Amazon Web Services)" "Docker" \
         "Stripe" "MySQL" "Doctrine ORM" "GraphQL" "Node.js"; do
  esc=$(printf '%s' "$k" | sed 's/[.[\*^$()+?{|]/\\&/g')
  printf '%s' "$TXT" | grep -qE "(: |, )$esc(,|$)" && echo "PASS  token '$k'" \
    || { echo "FAIL  '$k' is not a delimited skill token"; fail=1; }
done

# --- 10. length budget ---
W=$(printf '%s' "$TXT" | wc -w | tr -d ' ')
if [ "$W" -le 1300 ]; then echo "PASS  word count $W <= 1300"; else echo "FAIL  word count $W > 1300"; fail=1; fi

# --- 11. font floor: w:sz is half-points, nothing below 20 (10pt) ---
ck "no runs below 10pt" \
   "$(printf '%s' "$X" | grep -o 'w:sz w:val=\"[0-9]*\"' | grep -oE '[0-9]+' | awk '$1<20{c++} END{print c+0}')" 0

# --- 12. PARSE-FIDELITY PROOF: docx text stream matches the shipped .txt ---
norm(){ sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//' | grep -v '^$'; }
if [ -f "$T" ]; then
  diff <(printf '%s\n' "$TXT" | norm) <(norm < "$T") \
    && echo "PASS  docx text stream == txt golden file" \
    || { echo "FAIL  docx/txt divergence (diff above)"; fail=1; }
else
  echo "SKIP  txt golden file not found at $T"
fi

echo "=== $([ $fail -eq 0 ] && echo ALL PASS || echo SOME FAILED) ==="
exit $fail
