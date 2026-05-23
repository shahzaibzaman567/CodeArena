export const normalizeEmail = (value) => {
  if (!value || typeof value !== "string") return "";

  const normalized = value.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return normalized;
  }

  const gmailDomains = ["gmail.com", "googlemail.com"];
  if (gmailDomains.includes(domain)) {
    const local = localPart.split("+")[0].replace(/\./g, "");
    return `${local}@gmail.com`;
  }

  return normalized;
};

export const getClerkPrimaryEmail = (clerkUser) => {
  if (!clerkUser) return "";

  if (clerkUser.primaryEmailAddress?.emailAddress) {
    return normalizeEmail(clerkUser.primaryEmailAddress.emailAddress);
  }

  const emailAddresses = Array.isArray(clerkUser.email_addresses) ? clerkUser.email_addresses : [];

  if (clerkUser.primary_email_address_id) {
    const primaryEntry = emailAddresses.find(
      (entry) => entry?.id === clerkUser.primary_email_address_id && entry?.email_address
    );
    if (primaryEntry?.email_address) {
      return normalizeEmail(primaryEntry.email_address);
    }
  }

  const verified = emailAddresses.find(
    (entry) =>
      (entry?.verification?.status === "verified" || entry?.verified) && entry?.email_address
  );
  const primary =
    verified?.email_address || emailAddresses[0]?.email_address || clerkUser.email;

  return normalizeEmail(primary);
};

export const buildFallbackEmail = (clerkId) => {
  const safeId = `${clerkId || "user"}`.replace(/[^a-zA-Z0-9]/g, "_");
  return `${safeId}@clerk.codearena.local`;
};
