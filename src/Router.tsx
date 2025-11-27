import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Homepage } from "./pages/Homepage";
import { Spreadsheet } from "./pages/Spreadsheet";
import { RequireAuth } from "./components/RequireAuth";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route
          path="/spreadsheet/:id?"
          element={
            <RequireAuth>
              <Spreadsheet />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
