import { useState } from "react";

import "./Spreadsheet.css";
import { SpreadsheetCompute } from "./SpreadsheetCompute";
import { ActiveUsers } from "./ActiveUsers";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { FileMenu } from "./FileMenu";

export const SpreadsheetMenu = () => {
  const [name, setName] = useState<string>("Feuille de calcul sans titre");
  return (
    <div className="header-menu-wrapper">
      <div className="header-menu-title-row">
        <input
          type="text"
          name="spreadsheet-name"
          className="header-menu-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="header-menu-bar">
        <FileMenu />
      </div>
    </div>
  );
};

export const SpreadsheetHeader = () => {
  const { activeUsers } = useSpreadsheet();
  return (
    <>
      <div className="header">
        <div className="header-logo">
          <img src="/vite.svg" alt="Logo" width="40px" />
        </div>
        <SpreadsheetMenu />
        <div className="header-actions">
          <ActiveUsers users={activeUsers} maxVisible={3} />
        </div>
      </div>
      <SpreadsheetCompute />
    </>
  );
};
