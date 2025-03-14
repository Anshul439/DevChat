import React from "react";
import ThemeToggle from "@/components/themeToggle";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar"
import {
  MessageCircle,
  Users,
  Lock,
  ArrowRight,
  Globe,
  Shield,
  Sparkles,
  Github,
  Twitter,
  Linkedin,
  Star,
  Rocket,
  Clock,
  Code,
  PieChart,
  Phone,
  MapPin,
} from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
          <div className="container mx-auto px-6 md:px-8 text-center relative">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Connect With Anyone, Anywhere
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Experience real-time messaging like never before with our modern
              chat application. Built for teams who value security and seamless
              communication.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button className="bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300">
                Start Chatting Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
              >
                View Demo
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Enterprise-grade security
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Available worldwide
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Team collaboration
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className="py-16 md:pb-24 px-10 pt-12 bg-gray-50 dark:bg-gray-800"
          id="features"
        >
          <div className="container mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful Features for Modern Teams
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Everything you need to keep your team connected and productive
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: MessageCircle,
                  title: "Real-time Chat",
                  description:
                    "Instant messaging with real-time updates and notifications. Never miss an important message.",
                },
                {
                  icon: Users,
                  title: "Group Chats",
                  description:
                    "Create and manage group conversations easily. Perfect for team collaboration.",
                },
                {
                  icon: Lock,
                  title: "Secure",
                  description:
                    "End-to-end encryption ensures your conversations stay private and secure.",
                },
                {
                  icon: Globe,
                  title: "Global Access",
                  description:
                    "Access your chats from anywhere in the world with our cloud-based platform.",
                },
                {
                  icon: Shield,
                  title: "Enterprise Ready",
                  description:
                    "Advanced security features and admin controls for enterprise customers.",
                },
                {
                  icon: Sparkles,
                  title: "AI Assistant",
                  description:
                    "Built-in AI assistant helps you stay productive and organized.",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition duration-300"
                >
                  <div className="bg-orange-600 dark:bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Testimonials Section */}
      <section
        className="py-16 md:py-24 bg-white dark:bg-gray-900"
        id="testimonials"
      >
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Users Say
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Trusted by teams around the world for seamless communication
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "CEO, Tech Innovations",
                quote:
                  "DevChat has revolutionized how our team communicates. It's secure, fast, and incredibly intuitive.",
                rating: 5,
              },
              {
                name: "Mike Rodriguez",
                role: "CTO, Global Solutions",
                quote:
                  "The AI assistant and global access features are game-changers for our distributed team.",
                rating: 5,
              },
              {
                name: "Emily Chen",
                role: "Project Manager, Creative Agency",
                quote:
                  "End-to-end encryption gives us peace of mind. DevChat is now our go-to communication platform.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition duration-300"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-orange-500"
                      fill="currentColor"
                    />
                  ))}
                </div>
                <p className="mb-6 text-gray-700 dark:text-gray-300 italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance and Scalability Section */}
      <section
        className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800"
        id="performance"
      >
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Performance at Scale
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for speed, reliability, and seamless communication across
              any team size
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: Rocket,
                title: "Ultra-Fast",
                description: "Millisecond message delivery",
              },
              {
                icon: Clock,
                title: "Low Latency",
                description: "99.99% uptime guarantee",
              },
              {
                icon: Code,
                title: "Scalable",
                description: "Supports millions of users",
              },
              {
                icon: PieChart,
                title: "Efficient",
                description: "Minimal resource consumption",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition"
              >
                <div className="bg-orange-100 dark:bg-orange-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-orange-600 dark:text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-16 bg-white dark:bg-gray-900" id="contact">
        <div className="container mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl pb-4 md:text-4xl font-bold">Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              Have questions or need help? Reach out to us, and we’ll get back
              to you as soon as possible.
            </p>
          </div>
          <form className="max-w-2xl mx-auto">
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Your Name"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Your Email"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Your Message"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 transition"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6 md:px-16 py-12">
          <div className="grid md:grid-cols-4 gap-40">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-600 dark:bg-orange-500 p-2 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-500">
                DevChat
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connecting people through modern messaging. Build better
                relationships with seamless communication.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Github className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "FAQ", "API", "Integration"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Press", "Partners"],
              },
              {
                title: "Resources",
                links: [
                  "Documentation",
                  "Support",
                  "Security",
                  "Privacy",
                  "Terms",
                ],
              },
            ].map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">
                  {section.title}
                </h4>
                <ul className="space-y-2 text-sm">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href="#"
                        className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500 transition"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                © {new Date().getFullYear()} DevChat. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm text-gray-600 dark:text-gray-300">
                <a
                  href="#"
                  className="hover:text-orange-600 dark:hover:text-orange-500 transition"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="hover:text-orange-600 dark:hover:text-orange-500 transition"
                >
                  Terms of Service
                </a>
                <a
                  href="#"
                  className="hover:text-orange-600 dark:hover:text-orange-500 transition"
                >
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
