// Mock data for events with stock videos
export const mockEvents = [
  // Standup Comedy
  {
    id: 1,
    title: "Comedy Night with John Doe",
    creator: "johndoe.eth",
    category: "standup-comedy",
    date: "2025-04-15T19:00:00",
    duration: 90,
    participants: 42,
    maxParticipants: 100,
    ticketPrice: 5,
    description:
      "Join us for a night of laughter with John Doe, known for his witty observations and hilarious takes on everyday life.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-changing-lights-1240-large.mp4",
  },
  {
    id: 2,
    title: "Improv Comedy Showcase",
    creator: "improv.eth",
    category: "standup-comedy",
    date: "2025-04-22T20:00:00",
    duration: 75,
    participants: 35,
    maxParticipants: 80,
    ticketPrice: 7,
    description:
      "An evening of unscripted comedy where performers create scenes, characters, and jokes on the spot based on audience suggestions.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-excited-man-dancing-shot-from-below-32746-large.mp4",
  },
  {
    id: 3,
    title: "Comedy Open Mic Night",
    creator: "laughfactory.eth",
    category: "standup-comedy",
    date: "2025-05-05T19:30:00",
    duration: 120,
    participants: 20,
    maxParticipants: 50,
    ticketPrice: 3,
    description:
      "New and established comedians test their latest material in this supportive environment. Expect the unexpected!",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-multicolored-lights-32746-large.mp4",
  },

  // Performance Art
  {
    id: 4,
    title: "Contemporary Dance Performance",
    creator: "dancer.eth",
    category: "performance-art",
    date: "2025-04-25T20:00:00",
    duration: 60,
    participants: 50,
    maxParticipants: 100,
    ticketPrice: 12,
    description:
      "A mesmerizing contemporary dance performance exploring themes of isolation and connection in the digital age.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-in-a-club-with-colorful-lighting-1227-large.mp4",
  },
  {
    id: 5,
    title: "Experimental Performance: Digital Bodies",
    creator: "avantgarde.eth",
    category: "performance-art",
    date: "2025-05-10T19:00:00",
    duration: 90,
    participants: 30,
    maxParticipants: 60,
    ticketPrice: 15,
    description:
      "An experimental performance exploring the intersection of physical bodies and digital identities through movement and projection.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-with-neon-lights-around-her-32757-large.mp4",
  },
  {
    id: 6,
    title: "Interactive Performance: Audience as Art",
    creator: "collective.eth",
    category: "performance-art",
    date: "2025-05-18T18:00:00",
    duration: 120,
    participants: 25,
    maxParticipants: 40,
    ticketPrice: 10,
    description:
      "A boundary-pushing performance where the audience becomes part of the artwork through guided interactions and collaborative creation.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-in-a-nightclub-with-colorful-lighting-32748-large.mp4",
  },

  // Poetry Slam
  {
    id: 7,
    title: "Urban Poetry Slam",
    creator: "poet.eth",
    category: "poetry-slam",
    date: "2025-04-20T18:30:00",
    duration: 75,
    participants: 35,
    maxParticipants: 80,
    ticketPrice: 3,
    description:
      "Powerful spoken word performances addressing social issues, personal struggles, and urban life experiences.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-in-a-bar-1509-large.mp4",
  },
  {
    id: 8,
    title: "Digital Verses: Crypto Poetry Night",
    creator: "cryptopoet.eth",
    category: "poetry-slam",
    date: "2025-05-12T19:00:00",
    duration: 90,
    participants: 40,
    maxParticipants: 100,
    ticketPrice: 5,
    description:
      "A poetry slam exploring themes of digital identity, blockchain, and the future of art in the Web3 era.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-talking-in-a-bar-1512-large.mp4",
  },
  {
    id: 9,
    title: "Multilingual Poetry Exchange",
    creator: "worldpoets.eth",
    category: "poetry-slam",
    date: "2025-05-25T17:00:00",
    duration: 120,
    participants: 30,
    maxParticipants: 70,
    ticketPrice: 4,
    description:
      "Poets from around the world share their work in original languages with translations, celebrating linguistic diversity and cultural exchange.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-young-woman-vlogging-about-her-new-apartment-32299-large.mp4",
  },

  // Open Mic/Improv
  {
    id: 10,
    title: "Improv Theater Workshop",
    creator: "theater.eth",
    category: "open-mic",
    date: "2025-04-22T19:00:00",
    duration: 120,
    participants: 15,
    maxParticipants: 30,
    ticketPrice: 8,
    description:
      "Learn the fundamentals of improvisational theater in this interactive workshop led by experienced performers.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-playing-an-acoustic-guitar-on-stage-1725-large.mp4",
  },
  {
    id: 11,
    title: "Musical Open Mic Night",
    creator: "musiccollective.eth",
    category: "open-mic",
    date: "2025-05-08T20:00:00",
    duration: 180,
    participants: 25,
    maxParticipants: 60,
    ticketPrice: 5,
    description:
      "Musicians of all genres and skill levels share their original compositions and favorite covers in this supportive community event.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-playing-a-guitar-on-stage-1718-large.mp4",
  },
  {
    id: 12,
    title: "Storytelling Circle",
    creator: "storyteller.eth",
    category: "open-mic",
    date: "2025-05-15T18:30:00",
    duration: 120,
    participants: 20,
    maxParticipants: 40,
    ticketPrice: 6,
    description:
      "Share and listen to personal stories, folk tales, and fictional narratives in this intimate gathering of storytellers.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-playing-a-guitar-on-stage-1719-large.mp4",
  },

  // Live Painting
  {
    id: 13,
    title: "Abstract Live Painting",
    creator: "artist.eth",
    category: "live-painting",
    date: "2025-04-18T20:00:00",
    duration: 120,
    participants: 28,
    maxParticipants: 50,
    ticketPrice: 10,
    description:
      "Watch as an abstract masterpiece unfolds before your eyes, with the artist explaining their process and inspiration throughout.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-drawing-on-a-notebook-168-large.mp4",
  },
  {
    id: 14,
    title: "Digital Art Creation: From Blank Canvas to NFT",
    creator: "digitalartist.eth",
    category: "live-painting",
    date: "2025-05-05T19:00:00",
    duration: 90,
    participants: 35,
    maxParticipants: 70,
    ticketPrice: 12,
    description:
      "A live digital painting session where you'll witness the creation of an artwork from start to finish, culminating in its minting as an NFT.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-top-view-of-woman-drawing-in-a-notebook-168-large.mp4",
  },
  {
    id: 15,
    title: "Collaborative Mural Creation",
    creator: "muralcollective.eth",
    category: "live-painting",
    date: "2025-05-20T16:00:00",
    duration: 180,
    participants: 15,
    maxParticipants: 30,
    ticketPrice: 8,
    description:
      "Multiple artists work together to create a large-scale mural, blending their unique styles into a cohesive artwork.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-watercolor-painting-close-up-69-large.mp4",
  },

  // Creative Workshop
  {
    id: 16,
    title: "Digital Art Creation Workshop",
    creator: "digitalartist.eth",
    category: "creative-workshop",
    date: "2025-04-28T15:00:00",
    duration: 180,
    participants: 20,
    maxParticipants: 40,
    ticketPrice: 15,
    description:
      "Learn digital art techniques using popular software and create your own artwork under expert guidance.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-taking-pictures-of-a-plant-1389-large.mp4",
  },
  {
    id: 17,
    title: "NFT Creation Masterclass",
    creator: "nftguru.eth",
    category: "creative-workshop",
    date: "2025-05-10T14:00:00",
    duration: 240,
    participants: 25,
    maxParticipants: 50,
    ticketPrice: 20,
    description:
      "A comprehensive workshop covering the entire process of creating, minting, and selling NFTs, with hands-on practice.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-taking-pictures-of-plants-1388-large.mp4",
  },
  {
    id: 18,
    title: "Experimental Music Production",
    creator: "sounddesigner.eth",
    category: "creative-workshop",
    date: "2025-05-15T16:00:00",
    duration: 180,
    participants: 15,
    maxParticipants: 30,
    ticketPrice: 18,
    description:
      "Explore unconventional sound design and music production techniques to create unique audio experiences.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4",
  },
  {
    id: 19,
    title: "Web3 for Artists: Blockchain Basics",
    creator: "web3educator.eth",
    category: "creative-workshop",
    date: "2025-05-22T15:00:00",
    duration: 120,
    participants: 30,
    maxParticipants: 60,
    ticketPrice: 10,
    description:
      "An introductory workshop on blockchain technology, cryptocurrencies, and Web3 concepts specifically tailored for artists and creators.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-her-laptop-at-a-desk-4830-large.mp4",
  },
  {
    id: 20,
    title: "Creative Writing in the Digital Age",
    creator: "writer.eth",
    category: "creative-workshop",
    date: "2025-05-28T17:00:00",
    duration: 150,
    participants: 25,
    maxParticipants: 50,
    ticketPrice: 8,
    description:
      "Explore new forms of storytelling enabled by digital technologies, from interactive fiction to blockchain-based collaborative narratives.",
    image: "/placeholder.svg?height=200&width=400",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-writing-in-a-notebook-on-a-desk-4824-large.mp4",
  },
]

// Helper function to get events by category
export const getEventsByCategory = (category: string) => {
  if (category === "all") return mockEvents
  return mockEvents.filter((event) => event.category === category)
}

// Helper function to get a random event from a specific category
export const getRandomEventByCategory = (category: string) => {
  const categoryEvents = getEventsByCategory(category)
  return categoryEvents[Math.floor(Math.random() * categoryEvents.length)]
}
