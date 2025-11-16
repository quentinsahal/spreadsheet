import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Homepage } from "./pages/Homepage";
import { Spreadsheet } from "./pages/Spreadsheet";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/spreadsheet/:id?" element={<Spreadsheet />} />
      </Routes>
    </BrowserRouter>
  );
}
