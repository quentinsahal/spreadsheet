interface User {
  id: string;
  name: string;
  color?: string;
}

interface ActiveUsersProps {
  users: User[];
  maxVisible?: number;
}

const COLORS = [
  "#1a73e8", // Blue
  "#e8710a", // Orange
  "#0d9488", // Teal
  "#7c3aed", // Purple
  "#dc2626", // Red
  "#059669", // Green
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getUserColor(userId: string, customColor?: string): string {
  if (customColor) return customColor;
  const index = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[index % COLORS.length];
}

export function ActiveUsers({ users, maxVisible = 3 }: ActiveUsersProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexDirection: "row-reverse",
        justifyContent: "flex-end",
      }}
    >
      {remainingCount > 0 && (
        <div
          title={`+${remainingCount} more`}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#5f6368",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            marginLeft: -12,
            position: "relative",
            zIndex: 0,
          }}
        >
          +{remainingCount}
        </div>
      )}
      {[...visibleUsers].reverse().map((user, index) => (
        <div
          key={user.id}
          title={user.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: getUserColor(user.id, user.color),
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            marginLeft: index === visibleUsers.length - 1 ? 0 : -12,
            position: "relative",
            zIndex: index + 1,
          }}
        >
          {getInitials(user.name)}
        </div>
      ))}
    </div>
  );
}
