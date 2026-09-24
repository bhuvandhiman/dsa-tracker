# Review checklist

1. Run migrations and npm.cmd run dev. The dashboard contains major pattern cards and no global counters or library/history tabs.
2. Open a pattern row. It replaces the dashboard with a full-width detail screen. Every subpattern has its own bar, experience count, reason and dated last practice when known. Legacy-only evidence is labeled “Prior solves · date unknown.”
3. Expand a subpattern and problem. Inspect dated attempts and the undated legacy entry. Correct assistance, approach, notes or date; verify bars refresh and siblings remain independent. Remove a mistaken recording using the explicit confirmation.
4. Change primary browsing placement. Confirm existing attempt approaches and history remain intact.
5. Reload the unpacked Chrome extension and refresh a signed-in LeetCode problem. Run and old Accepted pages should stay quiet. A new Accepted result should open the compact prompt. Failed verdicts should stay quiet.
6. Save assistance, one approach and optional topics. Confirm the prompt closes only after a successful save. Test API-offline retry with the same recording.
7. Open extension Settings. Import/reimport should preserve existing details and avoid duplicates. Recent dates are included automatically; failure leaves legacy experience intact and offers retry. An account change must be rejected.
8. The fixture at port 8765 simulates these recording interactions without writing to the real database. It does not substitute for a signed-in Chrome check.
