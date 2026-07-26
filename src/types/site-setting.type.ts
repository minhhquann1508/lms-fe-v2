export interface FooterLink {
  label: string;
  url: string;
}

export interface SiteSetting {
  id: string;
  logoUrl: string | null;
  logoAlt: string | null;
  heroTitle: string;
  heroSubtitle: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;
  heroShowStats: boolean;
  ctaTitle: string | null;
  ctaDescription: string | null;
  ctaButtonText: string | null;
  footerBrandName: string;
  footerCopyright: string | null;
  footerLinks: FooterLink[];
  createdAt: string;
  updatedAt: string;
}
