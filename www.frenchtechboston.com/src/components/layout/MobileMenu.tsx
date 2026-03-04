import { useState } from 'react';

interface NavLink {
  label: string;
  href: string;
}

interface Props {
  navLinks: NavLink[];
  currentPath: string;
  user?: { email?: string } | null;
  member?: { name?: string; member_role?: string } | null;
}

export default function MobileMenu({ navLinks, currentPath, user, member }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-ft-black"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-ft-white">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center h-16 px-4 border-b border-gray-100">
              <a href="/" className="flex items-center gap-2">
                <img
                  src="/images/logo/ft-boston-logo.png"
                  alt="La French Tech Boston"
                  className="h-10 w-auto"
                />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-ft-black"
                aria-label="Close menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`block text-lg font-medium py-2 ${
                    currentPath === link.href
                      ? 'text-ft-red'
                      : 'text-ft-black hover:text-ft-red'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <hr className="my-4 border-gray-200" />

              {user ? (
                <>
                  <a
                    href="/members"
                    className="block text-lg font-medium py-2 text-ft-black hover:text-ft-red"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </a>
                  {member?.member_role === 'admin' && (
                    <a
                      href="/admin"
                      className="block text-lg font-medium py-2 text-ft-black hover:text-ft-red"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin
                    </a>
                  )}
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="block text-lg font-medium py-2 text-gray-500 hover:text-ft-red"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <a
                    href="/auth/login"
                    className="block text-lg font-medium py-2 text-ft-black hover:text-ft-red"
                    onClick={() => setIsOpen(false)}
                  >
                    Member Login
                  </a>
                  <a
                    href="/apply"
                    className="inline-block mt-4 px-6 py-3 bg-ft-red text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Join Us
                  </a>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
