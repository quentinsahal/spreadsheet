import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const userName = sessionStorage.getItem("userName");
    if (!userName) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/?redirect=${returnUrl}`, { replace: true });
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
