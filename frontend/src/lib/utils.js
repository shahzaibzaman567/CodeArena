export const normalizeEmail = (value) => {
  if (!value || typeof value !== "string") return "";

  const normalized = value.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) return normalized;

  const gmailDomains = ["gmail.com", "googlemail.com"];
  if (gmailDomains.includes(domain)) {
    const local = localPart.split("+")[0].replace(/\./g, "");
    return `${local}@gmail.com`;
  }

  return normalized;
};

export const getDifficultyBadgeClass = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "badge-success";
    case "medium":
      return "badge-warning";
    case "hard":
      return "badge-error";
    default:
      return "badge-ghost";
  }
};