function withValidProperties(
  properties: Record<string, undefined | string | string[]>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) =>
      Array.isArray(value) ? value.length > 0 : !!value
    )
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;
  return Response.json({
    accountAssociation: {
      header:
        "eyJmaWQiOjg4MDI1MywidHlwZSI6ImF1dGgiLCJrZXkiOiIweGM4NWExOThhRDI5YTk3QTlFYUFjMGVFNUY4ZjE5NEJjNDE1M2RFNjgifQ",
      payload: "eyJkb21haW4iOiJlcXVsZS52ZXJjZWwuYXBwIn0",
      signature:
        "srW1vEgOEYonbGqG70yHLNN0o5OhJB2jJr1UncY4hcM6S6Tcup1Vj8qmQVfOyk9IHWxAh7SVwdZybZyG/gWU1Bs=",
    },
    frame: withValidProperties({
      version: "1",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [],
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: ["game", "wordle", "fhenix", "fhe", "privacy"],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      // use only while testing
      noindex: "false",
    }),
    baseBuilder: {
      allowedAddresses: ["0x04beb550D7fF404E7bF4819B0b47a2B1711cDFfa"],
      ownerAddress: "0x04beb550D7fF404E7bF4819B0b47a2B1711cDFfa",
    },
  });
}
