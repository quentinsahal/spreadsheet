import { useTranslation } from "react-i18next";
import { Select, MenuItem } from "@mui/material";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split("-")[0];

  return (
    <Select
      value={currentLang}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      size="small"
      sx={{
        minWidth: 60,
        backgroundColor: "white",
        borderRadius: 0,
        "& .MuiSelect-select": {
          py: 0.25,
          px: 1,
          fontSize: "0.75rem",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#e0e0e0",
          borderRadius: 0,
        },
      }}
    >
      {LANGUAGES.map(({ code, label }) => (
        <MenuItem key={code} value={code} sx={{ fontSize: "0.75rem" }}>
          {label}
        </MenuItem>
      ))}
    </Select>
  );
}
