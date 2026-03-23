import { createFileRoute } from '@tanstack/react-router'
import { Heart, Users, Target, Zap } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  const developers = [
    { name: 'Developer 1', role: 'Team Leader', avatar: '👩‍💻', github: 'https://github.com/developer1' },
    { name: 'Developer 2', role: 'Full Stack Developer', avatar: '👨‍💻', github: 'https://github.com/developer2' },
    { name: 'Developer 3', role: 'UI/UX Designer', avatar: '👩‍🎨', github: 'https://github.com/developer3' },
    { name: 'Developer 4', role: 'Quality Assurance', avatar: '👨‍💻', github: 'https://github.com/developer4' },
  ]

  const features = [
    {
      icon: <Target className="w-8 h-8 text-[#0217f7]" />,
      title: 'Find Lost Items',
      description: 'Report lost belongings and browse a database of found items in your area'
    },
    {
      icon: <Zap className="w-8 h-8 text-[#0217f7]" />,
      title: 'Smart Matching',
      description: 'Our intelligent algorithm helps match lost items with found items'
    },
    {
      icon: <Users className="w-8 h-8 text-[#0217f7]" />,
      title: 'Community Driven',
      description: 'Connect with honest community members dedicated to helping reunite belongings'
    },
    {
      icon: <Heart className="w-8 h-8 text-[#0217f7]" />,
      title: 'Trust & Safety',
      description: 'Secure verification process and transparent tracking of all claims'
    },
  ]

  return (
    <div className="min-h-screen transition-colors duration-300 bg-transparent">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 text-slate-900 dark:text-white">
            About <span className="text-[#0217f7]">FLIRT</span>
          </h1>
          <p className="text-xl text-slate-700 dark:text-slate-200 mb-8">
            <span className="font-semibold"><span className="text-lime-400">F</span>inding</span> and <span className="font-semibold"><span className="text-lime-400">L</span>ocating</span> lost <span className="font-semibold"><span className="text-lime-400">I</span>tems</span> to <span className="font-semibold"><span className="text-lime-400">R</span>eturn</span> to <span className="font-semibold"><span className="text-lime-400">T</span>heir</span> rightful owners
          </p>
        </div>
      </section>

      {/* Project Description Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-slate-800/70">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">What is FLIRT?</h2>
          <div className="space-y-6 text-lg text-slate-800 dark:text-slate-200">
            <p>
              <strong className="text-lime-400">FLIRT</strong> (<span className="text-lime-400">F</span>ind, <span className="text-lime-400">L</span>ocate, <span className="text-lime-400">I</span>dentify, <span className="text-lime-400">R</span>ecover, <span className="text-lime-400">T</span>rack) is a community-driven platform dedicated to helping people reunite with their lost belongings. We believe that honesty and community support can make a real difference.
            </p>
            <p>
              Losing personal belongings can be a frustrating and disheartening experience. FLIRT was created with the mission to bridge the gap between people who have lost items and those who have found them. Our platform leverages technology and community spirit to increase the chances of successful reunions.
            </p>
            <p>
              Whether you've lost a cherished item or found something that doesn't belong to you, FLIRT provides a secure, transparent, and efficient way to connect with others in your community and make a positive impact.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">Our Mission</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-50 dark:bg-slate-700 p-8 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Connect</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Bring together people who have lost items with those who want to help return them.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-slate-700 p-8 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Simplify</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Make the process of reporting and recovering lost items simple and intuitive.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-slate-700 p-8 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Trust</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Build a trustworthy community where honesty and integrity are paramount.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-slate-700/70">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-slate-900 dark:text-white">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-slate-700 dark:text-slate-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center text-slate-900 dark:text-white">Meet the Team</h2>
          <p className="text-center text-lg text-slate-700 dark:text-slate-300 mb-12">
            FLIRT was built by a passionate team of developers and designers committed to making a difference.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {developers.map((dev, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-6xl mb-4">{dev.avatar}</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{dev.name}</h3>
                <p className="text-sm text-[#0217f7] font-medium">{dev.role}</p>
                <a
                  href={dev.github}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-slate-700 dark:text-slate-300 hover:text-[#0217f7] dark:hover:text-[#f5e102] underline"
                >
                  GitHub Profile
                </a>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 bg-blue-50 dark:bg-slate-700 rounded-lg text-center">
            <p className="text-slate-700 dark:text-slate-300">
              We're always looking for passionate individuals to join our mission. If you're interested in contributing to FLIRT, reach out to us!
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-slate-800/70">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center text-slate-900 dark:text-white">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-[#0217f7]">Honesty</h3>
              <p className="text-slate-700 dark:text-slate-300">
                We believe in the fundamental goodness of people and their willingness to help one another when given the opportunity.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-[#0217f7]">Community</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Together, we are stronger. Our platform thrives on the collaborative spirit of neighbors helping neighbors.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-[#0217f7]">Transparency</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Every transaction, every claim, and every interaction is tracked and verified to maintain trust and accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#0217f7] to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">Join Our Community</h2>
          <p className="text-xl text-blue-100 mb-8">
            Help reunite lost items with their rightful owners. Start reporting or searching for items today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="px-8 py-3 bg-white text-[#0217f7] font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Report Lost Item
            </a>
            <a
              href="/claim"
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              Search Found Items
            </a>
            <a
              href="https://discord.gg/TWPsZHvhH3"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-3 border-2 border-[#f5e102] text-[#f5e102] font-semibold rounded-lg hover:bg-[#f5e102] hover:text-[#0217f7] transition-colors"
            >
              Join Discord (Announcements)
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
