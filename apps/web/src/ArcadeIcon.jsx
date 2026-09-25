import { SvgIcon } from "@mui/material";
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  close: "M6 6l12 12 M6 18 18 6",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5.5 7a7.5 7.5 0 0 1 12.8-2L20 8 M4 16l1.7 3a7.5 7.5 0 0 0 12.8-2",
  code: "m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  branch:
    "M6 6v12 M6 12h7a5 5 0 0 0 5-5 M3 3h6v6H3z M3 16h6v6H3z M15 2h6v6h-6z",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  bolt: "m13 2-9 12h7l-1 8 10-13h-8z",
  history: "M3 4v6h6 M3 10a9 9 0 1 1 1 7 M12 7v5l3 2",
  chevron: "m9 5 7 7-7 7",
  edit: "M4 20h4l11-11-4-4L4 16v4 M13.5 6.5l4 4",
};
export default function ArcadeIcon({ name = "code", ...props }) {
  return (
    <SvgIcon {...props}>
      <path
        d={paths[name] || paths.code}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}
