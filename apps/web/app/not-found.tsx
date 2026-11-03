import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";

export default function NotFound() {
  return <div className="page-container flex min-h-[80vh] flex-col items-center justify-center pt-20 text-center"><Film size={42} className="mb-6 text-red-500" /><p className="eyebrow">404 · Off the reel</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">This scene doesn’t exist.</h1><p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">The title or page may have moved. Head back to discovery and find your next story.</p><Link href="/" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black"><ArrowLeft size={16} />Back to discovery</Link></div>;
}
