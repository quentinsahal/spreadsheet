import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Connect } from "./pages/Connect";
import { Spreadsheet } from "./pages/Spreadsheet";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Connect />} />
        <Route path="/spreadsheet/:id?" element={<Spreadsheet />} />
      </Routes>
    </BrowserRouter>
  );
}
