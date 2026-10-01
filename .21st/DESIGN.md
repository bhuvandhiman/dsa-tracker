# Recall visual foundation

The user selected the second reference image's warm palette and typography,
with playful rounded cards and details inspired by both supplied images.
The layout must be original and tailored to DSA rather than copied from either image.
The website fills the viewport with the ivory canvas. Do not wrap the page in a
centered card, outer border, rounded frame, shadow, or contrasting background gutter.
Rounded cards remain appropriate within the page.

Tokens live in apps/web/src/styles.css: ivory #fafbe9, coral #e96586,
mustard #f2b632, teal #2c8075, and ink #202720. Typography uses the locally
available Trebuchet MS / Segoe UI stack. No external font service is required.

Phase 1 is a visual shell with a working Coverage/Retention presentation switch
and illustrative pattern cards, without fabricated scores. Live API data and
detailed workflows are planned in docs/frontend-rebuild.md.

21st catalog search found Card Tabs, Tabs with Icons, and Card primitives.
The references informed component discovery; no catalog source code was retrieved
or installed. Existing React/Vite supports this small CSS-based foundation without
adding a parallel shadcn dependency stack.

Preserve the API, database, scoring and coverage policies, and Chrome extension.
The old frontend remains recoverable through Git history.
