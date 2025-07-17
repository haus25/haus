import { redirect } from 'next/navigation'

interface PageProps {
  params: { eventId: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function EventRoomPage({ params, searchParams }: PageProps) {
  // Build query string from search params
  const queryParams = new URLSearchParams()
  
  // Add eventId from path parameter
  queryParams.set('eventId', params.eventId)
  
  // Add any additional search params
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      queryParams.set(key, value)
    }
  })
  
  // Redirect to main room page with eventId as query parameter
  redirect(`/room?${queryParams.toString()}`)
} 