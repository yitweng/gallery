export default function GalleryNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-light text-stone-300">404</h1>
        <p className="mt-4 text-stone-500">Gallery not found</p>
        <a href="/" className="mt-6 inline-block text-sm text-stone-400 hover:text-stone-600">
          Back to home
        </a>
      </div>
    </div>
  );
}
