export default function handler(req, res) {
  res.status(200).json({
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) || null,
    anonPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) || null,
  });
}
