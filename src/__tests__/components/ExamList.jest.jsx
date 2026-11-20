import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ExamList from '../../components/ExamList'
import { getExams, updateExamStatus } from '../../utils/api'

jest.mock('../../utils/api', () => ({
  getExams: jest.fn(),
  updateExamStatus: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockedGetExams = getExams
const mockedUpdateExamStatus = updateExamStatus

const mockExams = [
  {
    id: 1,
    title: 'Exam A',
    status: 'pending',
    datetime: '2026-03-15 09:00:00',
    language: 'English',
    location_id: 1,
    location: {
      id: 1,
      country: 'France',
      latitude: '48.8',
      longitude: '2.3',
    },
    candidates: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  },
  {
    id: 2,
    title: 'Exam B',
    status: 'started',
    datetime: '2026-03-20 14:00:00',
    language: 'French',
    location_id: 2,
    location: {
      id: 2,
      country: 'Germany',
      latitude: '52.5',
      longitude: '13.4',
    },
    candidates: [{ id: 3, name: 'Charlie' }],
  },
]

function renderExamList() {
  return render(
    <MemoryRouter>
      <ExamList />
    </MemoryRouter>
  )
}

describe('ExamList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loading state', () => {
    it('shows a loading message while fetching exams', () => {
      mockedGetExams.mockReturnValue(new Promise(() => {}))
      renderExamList()
      expect(screen.getByText('Loading sessions...')).toBeInTheDocument()
    })
  })

  describe('after a successful fetch', () => {
    beforeEach(() => {
      mockedGetExams.mockResolvedValue(mockExams)
    })

    it('renders the page heading', async () => {
      renderExamList()
      expect(await screen.findByRole('heading', { name: 'Exam schedule' })).toBeInTheDocument()
    })

    it('renders a card for each exam session', async () => {
      renderExamList()
      expect(await screen.findByText('Exam A')).toBeInTheDocument()
      expect(screen.getByText('Exam B')).toBeInTheDocument()
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Charlie/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('France').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Germany').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
      expect(screen.getAllByText('In progress').length).toBeGreaterThan(0)
    })

    it('renders each exam title', async () => {
      renderExamList()
      expect(await screen.findByText('Exam A')).toBeInTheDocument()
      expect(screen.getByText('Exam B')).toBeInTheDocument()
    })

    it('shows how many exams are displayed', async () => {
      renderExamList()
      expect(await screen.findByText('Showing 2 of 2 exams')).toBeInTheDocument()
    })
  })

  describe('when the fetch returns no exams', () => {
    it('shows an empty state message', async () => {
      mockedGetExams.mockResolvedValue([])
      renderExamList()
      expect(await screen.findByText('No sessions to display...')).toBeInTheDocument()
    })
  })

  describe('when the fetch fails', () => {
    it('shows an error state message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockedGetExams.mockRejectedValue(new Error('Network error'))
      renderExamList()
      expect(await screen.findByText("Couldn't load the schedule")).toBeInTheDocument()
      expect(screen.getByText("The exams API didn't respond.")).toBeInTheDocument()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('status overview strip', () => {
    beforeEach(() => {
      mockedGetExams.mockResolvedValue(mockExams)
    })

    it('filters the list when a status count is clicked and clears on a second click', async () => {
      renderExamList()
      expect(await screen.findByText('Exam A')).toBeInTheDocument()
      expect(screen.getByText('Exam B')).toBeInTheDocument()

      const pendingFilter = screen.getByRole('button', { name: /Pending/i })
      await userEvent.click(pendingFilter)

      expect(screen.getByText('Exam A')).toBeInTheDocument()
      expect(screen.queryByText('Exam B')).not.toBeInTheDocument()
      expect(screen.getByText(/Showing 1 of 2 exams · Pending only/)).toBeInTheDocument()
      expect(pendingFilter).toHaveAttribute('aria-pressed', 'true')

      await userEvent.click(pendingFilter)

      expect(screen.getByText('Exam A')).toBeInTheDocument()
      expect(screen.getByText('Exam B')).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 2 exams')).toBeInTheDocument()
      expect(pendingFilter).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('status advance', () => {
    it('advances a pending exam to started without a full page reload', async () => {
      mockedGetExams.mockResolvedValue([mockExams[0]])
      mockedUpdateExamStatus.mockResolvedValue({ ...mockExams[0], status: 'started' })

      renderExamList()
      expect(await screen.findByText('Exam A')).toBeInTheDocument()
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)

      const startButtons = screen.getAllByRole('button', { name: 'Start exam' })
      await userEvent.click(startButtons[0])

      await waitFor(() => {
        expect(mockedUpdateExamStatus).toHaveBeenCalledWith(1, 'started')
      })

      await waitFor(() => {
        expect(screen.getAllByText('In progress').length).toBeGreaterThan(0)
        expect(screen.getAllByRole('button', { name: 'Finish exam' }).length).toBeGreaterThan(0)
      })
      expect(screen.queryByRole('button', { name: 'Start exam' })).not.toBeInTheDocument()
      expect(mockedGetExams).toHaveBeenCalledTimes(1)
    })
  })
})
