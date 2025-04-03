import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, AirVent, Bell, User, FileText, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Navbar } from "./navbar";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const menuItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="w-6 h-6 group-hover:text-primary-600" />,
      path: "/",
    },
    {
      label: "AC Units",
      icon: <AirVent className="w-6 h-6 group-hover:text-primary-600" />,
      path: "/ac-units",
    },
    {
      label: "Reminders",
      icon: <Bell className="w-6 h-6 group-hover:text-primary-600" />,
      path: "/reminders",
      badge: 2,
    },
    {
      label: "Profile",
      icon: <User className="w-6 h-6 group-hover:text-primary-600" />,
      path: "/profile",
    },
  ];

  const secondaryItems = [
    {
      label: "Documentation",
      icon: <FileText className="w-6 h-6 group-hover:text-primary-600" />,
      path: "#",
    },
    {
      label: "Help & Support",
      icon: <HelpCircle className="w-6 h-6 group-hover:text-primary-600" />,
      path: "#",
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside
        id="sidebar"
        className={cn(
          "fixed z-30 h-full top-0 left-0 pt-16 flex flex-shrink-0 flex-col w-64 transition-all duration-300 lg:flex",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Sidebar"
      >
        <div className="relative flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white pt-0">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex-1 px-3 bg-white divide-y space-y-1">
              <ul className="space-y-2 pb-2">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link 
                      href={item.path}
                      className={cn(
                        "text-base font-normal rounded-lg flex items-center p-2 group",
                        location === item.path
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      {React.cloneElement(item.icon, {
                        className: cn(
                          "w-6 h-6",
                          location === item.path
                            ? "text-primary-600"
                            : "text-gray-500 group-hover:text-gray-900"
                        ),
                      })}
                      <span className="ml-3 flex-1 whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="bg-primary-100 text-primary-800 text-xs font-medium inline-flex items-center justify-center px-2 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 pt-2">
                {secondaryItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.path}
                    className="text-base text-gray-900 font-normal rounded-lg hover:bg-gray-100 group transition duration-75 flex items-center p-2"
                  >
                    {React.cloneElement(item.icon, {
                      className: "w-6 h-6 text-gray-500 group-hover:text-gray-900",
                    })}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-base text-gray-900 font-normal rounded-lg hover:bg-gray-100 group transition duration-75 flex items-center p-2"
                >
                  <LogOut className="w-6 h-6 text-gray-500 group-hover:text-gray-900" />
                  <span className="ml-3">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="flex overflow-hidden pt-16">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div
          id="main-content"
          className="h-full w-full bg-gray-50 relative overflow-y-auto lg:ml-64"
        >
          <main className="py-10 px-4 sm:px-6 lg:px-8">{children}</main>
          
          {/* Footer */}
          <footer className="bg-white p-4 sm:p-6 border-t border-gray-200">
            <div className="md:flex md:justify-between">
              <div className="mb-6 md:mb-0">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold flex items-center">
                    <span className="text-primary">Cool</span>
                    <span className="text-gray-900">Track</span>
                  </span>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
                <div>
                  <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase">Resources</h2>
                  <ul className="text-gray-600">
                    <li className="mb-4">
                      <a href="#" className="hover:underline">Documentation</a>
                    </li>
                    <li>
                      <a href="#" className="hover:underline">API</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase">Legal</h2>
                  <ul className="text-gray-600">
                    <li className="mb-4">
                      <a href="#" className="hover:underline">Privacy Policy</a>
                    </li>
                    <li>
                      <a href="#" className="hover:underline">Terms &amp; Conditions</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase">Contact</h2>
                  <ul className="text-gray-600">
                    <li className="mb-4">
                      <a href="#" className="hover:underline">Support</a>
                    </li>
                    <li>
                      <a href="#" className="hover:underline">Contact Us</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <hr className="my-6 border-gray-200 sm:mx-auto lg:my-8" />
            <div className="sm:flex sm:items-center sm:justify-between">
              <span className="text-sm text-gray-500 sm:text-center">
                © {new Date().getFullYear()} <a href="#" className="hover:underline">CoolTrack™</a>. All Rights Reserved.
              </span>
              <div className="flex mt-4 space-x-6 sm:justify-center sm:mt-0">
                <a href="#" className="text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
