import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

export default NextAuth({
  session: {
    strategy: "jwt",
  },

  providers: [
    // Google Workspace (OIDC)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Optional: hard enforce Google Workspace domain
      // authorization: { params: { hd: process.env.GOOGLE_WORKSPACE_DOMAIN } },
    }),

    // Azure AD (OIDC)
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID, // "common" or your tenant GUID
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist basic identity into JWT
      if (account && profile) {
        token.email = profile.email || token.email;
        token.name = profile.name || token.name;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose identity to the app
      session.user.email = token.email;
      session.user.name = token.name;
      return session;
    },

    async signIn({ user }) {
      // Optional: restrict who can sign in (enterprise gate)
      // Example: only allow emails from a specific domain
      const allowDomain = process.env.SSO_ALLOWED_DOMAIN;
      if (allowDomain && user?.email) {
        const domain = user.email.split("@")[1]?.toLowerCase();
        if (domain !== allowDomain.toLowerCase()) return false;
      }
      return true;
    },
  },

  pages: {
    signIn: "/admin/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
});
