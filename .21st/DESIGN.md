# Recall visual foundation

The user selected the second reference image's warm palette and typography,
with playful rounded cards and details inspired by both supplied images.
The layout must be original and tailored to DSA rather than copied from either image.
The website fills the viewport with the ivory canvas. Do not wrap the page in a
centered card, outer border, rounded frame, shadow, or contrasting background gutter.
Rounded cards remain appropriate within the page.
The top-bar moon switches to dark mode; the sun switches back to light mode.
Dark mode uses warm charcoal surfaces with cream text, keeping the colorful inner
cards. Light mode is the default; the explicit choice is saved in local storage.

Tokens live in apps/web/src/styles.css: ivory #fafbe9, coral #e96586,
mustard #f2b632, teal #2c8075, and ink #202720. Typography uses the locally
available Trebuchet MS / Segoe UI stack. No external font service is required.

Phase 2 connects live practice and goal data. Coverage orders by remaining goal
gaps; Retention separates dated practice (weakest first), undated experience,
and unpracticed patterns. Search includes subpattern names; matching categories open into a separate detail screen.
Coverage rings and strength bars remain separately labelled, without mastery claims
or invented scores. Goal controls change only the existing goal. Detailed problem
and history workflows remain Phase 3 in docs/frontend-rebuild.md.

21st catalog search found Card Tabs, Tabs with Icons, and Card primitives.
The references informed component discovery; no catalog source code was retrieved
or installed. Existing React/Vite supports this small CSS-based foundation without
adding a parallel shadcn dependency stack.

Preserve the API, database, scoring and coverage policies, and Chrome extension.
The old frontend remains recoverable through Git history.

Phase 2 catalog search found Progress primitives. Native progress elements and CSS coverage rings fit the established JavaScript/CSS foundation; no catalog code was installed.

User layout revision: Dashboard shows overview and goals. Patterns is a separate route with long, full-width neutral rows and coral/teal/mustard accents. Each row opens a separate routed subpattern detail panel. Avoid tiled pattern cards and inline subpattern expansion.
