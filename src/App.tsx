import { useState } from 'react'
import './App.css'

type Subject = { id: string; code: string; name: string; faculty: string; hasLab: boolean; color: string }
type Slot = { day: string; time: string; subject: Subject; room: string; className: string; sessionType: 'lecture' | 'lab' }
type Exam = { subject: Subject; date: string }
type View = 'setup' | 'schedule' | 'teachers' | 'exams'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const times = ['09:00 AM - 11:00 AM', '11:15 AM - 01:15 PM', '01:45 PM - 03:45 PM', '04:00 PM - 06:00 PM']
const classNames = ['EXCS A', 'EXCS B']
const colors = ['coral', 'blue', 'green', 'gold', 'violet']
const initialSubjects: Subject[] = [
  { id: 'subject-1', code: '', name: '', faculty: '', hasLab: false, color: 'blue' },
]

type Session = { subject: Subject; className: string; sessionType: 'lecture' | 'lab' }

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function graphColorSchedule(subjects: Subject[], rooms: string[]): Slot[] | null {
  const sessions: Session[] = classNames.flatMap((className) => subjects.flatMap((subject) => [
    { subject, className, sessionType: 'lecture' as const },
    ...(subject.hasLab ? [{ subject, className, sessionType: 'lab' as const }] : []),
  ]))
  const lectureRooms = rooms.filter((room) => !room.startsWith('L'))
  const labRooms = rooms.filter((room) => room.startsWith('L'))
  if (sessions.some((session) => session.sessionType === 'lecture') && !lectureRooms.length) return null
  if (sessions.some((session) => session.sessionType === 'lab') && !labRooms.length) return null

  const edges = sessions.map(() => new Set<number>())
  const subjectClassSessions = new Map<string, { lecture?: number; lab?: number }>()
  sessions.forEach((session, index) => {
    sessions.forEach((other, otherIndex) => {
      if (otherIndex <= index) return
      if (session.className === other.className || session.subject.faculty.trim().toLocaleLowerCase() === other.subject.faculty.trim().toLocaleLowerCase()) {
        edges[index].add(otherIndex)
        edges[otherIndex].add(index)
      }
    })
    const key = `${session.subject.id}:${session.className}`
    const pair = subjectClassSessions.get(key) ?? {}
    pair[session.sessionType] = index
    subjectClassSessions.set(key, pair)
  })

  const labPairs = [...subjectClassSessions.values()]
    .filter((pair): pair is { lecture: number; lab: number } => pair.lecture !== undefined && pair.lab !== undefined)
  const slotCount = days.length * times.length
  const assigned = Array(sessions.length).fill(-1) as number[]
  const dayLoads = classNames.map(() => Array(days.length).fill(0) as number[])
  const classIndex = new Map(classNames.map((className, index) => [className, index]))

  const canUseSlot = (sessionIndex: number, slot: number) => {
    if ([...edges[sessionIndex]].some((neighbor) => assigned[neighbor] === slot)) return false
    const day = Math.floor(slot / times.length)
    if (labPairs.some((pair) =>
      (pair.lecture === sessionIndex && assigned[pair.lab] >= 0 && Math.floor(assigned[pair.lab] / times.length) === day)
      || (pair.lab === sessionIndex && assigned[pair.lecture] >= 0 && Math.floor(assigned[pair.lecture] / times.length) === day),
    )) return false
    const session = sessions[sessionIndex]
    const capacity = session.sessionType === 'lab' ? labRooms.length : lectureRooms.length
    const usedRooms = assigned.reduce((count, assignedSlot, index) =>
      count + Number(assignedSlot === slot && sessions[index].sessionType === session.sessionType), 0)
    return usedRooms < capacity
  }

  const findNextSession = () => {
    let bestIndex = -1
    let bestSaturation = -1
    let bestDegree = -1
    let tied: number[] = []
    for (let index = 0; index < sessions.length; index++) {
      if (assigned[index] >= 0) continue
      const saturation = new Set([...edges[index]].map((neighbor) => assigned[neighbor]).filter((slot) => slot >= 0)).size
      const degree = [...edges[index]].filter((neighbor) => assigned[neighbor] < 0).length
      if (saturation > bestSaturation || (saturation === bestSaturation && degree > bestDegree)) {
        bestIndex = index
        bestSaturation = saturation
        bestDegree = degree
        tied = [index]
      } else if (saturation === bestSaturation && degree === bestDegree) {
        tied.push(index)
      }
    }
    return tied.length > 1 ? tied[Math.floor(Math.random() * tied.length)] : bestIndex
  }

  const color = (remaining: number): boolean => {
    if (remaining === 0) return true
    const sessionIndex = findNextSession()
    const session = sessions[sessionIndex]
    const sessionClassIndex = classIndex.get(session.className)!
    const candidates = shuffled(Array.from({ length: slotCount }, (_, index) => index))
      .filter((slot) => canUseSlot(sessionIndex, slot))
      .sort((left, right) =>
        dayLoads[sessionClassIndex][Math.floor(left / times.length)]
          - dayLoads[sessionClassIndex][Math.floor(right / times.length)],
      )

    for (const slot of candidates) {
      assigned[sessionIndex] = slot
      dayLoads[sessionClassIndex][Math.floor(slot / times.length)]++
      if (color(remaining - 1)) return true
      dayLoads[sessionClassIndex][Math.floor(slot / times.length)]--
      assigned[sessionIndex] = -1
    }
    return false
  }

  if (sessions.some((session) =>
    sessions.filter((other) => other.className === session.className).length > slotCount,
  ) || !color(sessions.length)) return null

  const roomUse = new Map<string, Set<string>>()
  return sessions.map((session, index) => {
    const slot = assigned[index]
    const availableRooms = session.sessionType === 'lab' ? labRooms : lectureRooms
    const used = roomUse.get(`${slot}:${session.sessionType}`) ?? new Set<string>()
    roomUse.set(`${slot}:${session.sessionType}`, used)
    const room = shuffled(availableRooms).find((candidate) => !used.has(candidate))
    if (!room) throw new Error(`No ${session.sessionType} room remains for ${days[Math.floor(slot / times.length)]}.`)
    used.add(room)
    return {
      day: days[Math.floor(slot / times.length)],
      time: times[slot % times.length],
      subject: session.subject,
      room,
      className: session.className,
      sessionType: session.sessionType,
    }
  })
}

function createExamSchedule(subjects: Subject[]): Exam[] {
  const firstExamDate = Date.UTC(2026, 10, 16)
  const lastExamDate = Date.UTC(2026, 11, 16)
  const dayLength = 24 * 60 * 60 * 1000
  const minimumGap = 2 * dayLength
  if ((subjects.length - 1) * minimumGap > lastExamDate - firstExamDate) {
    throw new Error('There are too many subjects to fit exams with 1–2 free days between November 16 and December 16, excluding Sundays.')
  }
  const memo = new Map<string, boolean>()
  const canCompleteSchedule = (currentDate: number, remainingExams: number): boolean => {
    if (remainingExams === 0) return true
    const key = `${currentDate}:${remainingExams}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    const canFit = [2, 3].some((gap) => {
      const nextDate = currentDate + gap * dayLength
      return nextDate <= lastExamDate
        && new Date(nextDate).getUTCDay() !== 0
        && canCompleteSchedule(nextDate, remainingExams - 1)
    })
    memo.set(key, canFit)
    return canFit
  }
  const remainingExams = subjects.length - 1
  if (!canCompleteSchedule(firstExamDate, remainingExams)) {
    throw new Error('There are too many subjects to fit exams with 1–2 free days between November 16 and December 16, excluding Sundays.')
  }

  const examDates = [firstExamDate]
  let currentDate = firstExamDate
  for (let remaining = remainingExams; remaining > 0; remaining--) {
    const nextDates = [2, 3]
      .map((gap) => currentDate + gap * dayLength)
      .filter((date) => date <= lastExamDate
        && new Date(date).getUTCDay() !== 0
        && canCompleteSchedule(date, remaining - 1))
    currentDate = nextDates[Math.floor(Math.random() * nextDates.length)]
    examDates.push(currentDate)
  }

  return shuffled(subjects).map((subject, index) => ({
    subject,
    date: new Date(examDates[index]).toISOString().slice(0, 10),
  }))
}

function WeeklyTimetable({ schedule, selectedClass, onSelectClass }: {
  schedule: Slot[]
  selectedClass?: string
  onSelectClass?: (className: string) => void
}) {
  const visibleSchedule = selectedClass ? schedule.filter((slot) => slot.className === selectedClass) : schedule
  const getSlots = (day: string, time: string) => visibleSchedule.filter((slot) => slot.day === day && slot.time === time)

  return (
    <>
      {onSelectClass && (
        <div className="class-tabs" aria-label="Select class">
          {classNames.map((className) => (
            <button className={selectedClass === className ? 'active' : ''} key={className} onClick={() => onSelectClass(className)}>
              {className}
            </button>
          ))}
        </div>
      )}
      <div className="timetable-wrap">
        <div className="timetable">
          <div className="time-column">
            <div className="corner-cell">TIME</div>
            {times.map((time) => <div className="time-cell" key={time}>{time}</div>)}
          </div>
          {days.map((day) => (
            <div className="day-column" key={day}>
              <div className="day-header">{day.slice(0, 3).toUpperCase()}<small>{day}</small></div>
              {times.map((time) => (
                <div className="class-cell" key={time}>
                  {getSlots(day, time).map((slot) => (
                    <div className={`class-card ${slot.subject.color} ${slot.sessionType}`} key={`${slot.className}-${slot.subject.id}-${slot.sessionType}`}>
                      <strong>{slot.subject.code} {slot.sessionType === 'lab' ? 'Lab' : 'Lecture'}</strong>
                      <span>{slot.subject.faculty}</span>
                      <small>{slot.room}{onSelectClass ? '' : ` · ${slot.className}`}</small>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function App() {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [rooms, setRooms] = useState(['F205', 'F201', 'F105'])
  const [newRoom, setNewRoom] = useState('')
  const [schedule, setSchedule] = useState<Slot[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [activeView, setActiveView] = useState<View>('setup')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedClass, setSelectedClass] = useState(classNames[0])
  const [notice, setNotice] = useState('')

  const teachers = [...new Set(subjects.map((subject) => subject.faculty.trim()).filter(Boolean))]
  const activeTeacher = teachers.includes(selectedTeacher) ? selectedTeacher : teachers[0] ?? ''
  const teacherSchedule = schedule.filter((slot) => slot.subject.faculty.trim() === activeTeacher)

  const invalidateTimetables = () => {
    setSchedule([])
    setExams([])
  }
  const updateSubject = (id: string, changes: Partial<Omit<Subject, 'id'>>) => {
    setSubjects((current) => current.map((subject) => subject.id === id ? { ...subject, ...changes } : subject))
    invalidateTimetables()
    setNotice('')
  }
  const addSubject = () => {
    setSubjects((current) => [...current, {
      id: `subject-${Date.now()}-${current.length}`,
      code: '',
      name: '',
      faculty: '',
      hasLab: false,
      color: colors[current.length % colors.length],
    }])
    invalidateTimetables()
    setNotice('')
  }
  const removeSubject = (id: string) => {
    setSubjects((current) => current.filter((subject) => subject.id !== id))
    invalidateTimetables()
    setNotice('')
  }
  const addRoom = () => {
    const room = newRoom.trim().toUpperCase()
    if (room && !rooms.includes(room)) {
      setRooms((current) => [...current, room])
      invalidateTimetables()
    }
    setNewRoom('')
  }
  const removeRoom = (room: string) => {
    setRooms((current) => current.filter((item) => item !== room))
    invalidateTimetables()
  }

  const generateSchedule = () => {
    if (!subjects.length) {
      setNotice('Add at least one subject before generating timetables.')
      return
    }
    const missing = subjects.find((subject) => !subject.code.trim() || !subject.name.trim() || !subject.faculty.trim())
    if (missing) {
      setNotice('Enter a subject code, subject name, and faculty name for every subject.')
      return
    }
    const duplicateCode = subjects.find((subject, index) => subjects.some((other, otherIndex) =>
      index !== otherIndex && subject.code.trim().toLocaleLowerCase() === other.code.trim().toLocaleLowerCase(),
    ))
    if (duplicateCode) {
      setNotice(`Subject code ${duplicateCode.code.trim()} is used more than once. Each subject needs a unique code.`)
      return
    }

    try {
      const nextSchedule = graphColorSchedule(subjects, rooms)
      if (!nextSchedule) {
        const hasLab = subjects.some((subject) => subject.hasLab)
        const lectureRooms = rooms.some((room) => !room.startsWith('L'))
        const labRooms = rooms.some((room) => room.startsWith('L'))
        setNotice(!lectureRooms
          ? 'Add at least one lecture room (room name must not start with L).'
          : hasLab && !labRooms
            ? 'Add at least one lab room whose name starts with L.'
            : 'Could not find a conflict-free schedule. Try adding rooms or reducing the number of subjects.')
        return
      }
      const nextExams = createExamSchedule(subjects)
      setSchedule(nextSchedule)
      setExams(nextExams)
      setNotice('')
      setActiveView('schedule')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to generate the timetables.')
    }
  }

  const examDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const tabs: { id: View; number: string; label: string }[] = [
    { id: 'setup', number: '01', label: 'Setup' },
    { id: 'schedule', number: '02', label: 'Class timetables' },
    { id: 'teachers', number: '03', label: 'Teacher timetables' },
    { id: 'exams', number: '04', label: 'Exam timetable' },
  ]

  return (
    <main className="app-shell">
      <header className="topbar"><strong className="brand">College Timetable Generator</strong><span className="topbar-meta">Odd Semester 2026</span></header>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">ANALYSIS OF ALGORITHMS PROJECT</p>
          <h1>Create a complete timetable</h1>
          <p className="hero-text">Add subjects and faculty, then generate randomized class, teacher, and exam schedules.</p>
        </div>
      </section>
      <nav className="view-tabs" aria-label="Timetable views">
        {tabs.map((tab) => (
          <button
            className={activeView === tab.id ? 'active' : ''}
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            disabled={tab.id !== 'setup' && !schedule.length}
          >
            {tab.number} <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {activeView === 'setup' && (
        <section className="content-grid">
          <div className="panel subjects-panel">
            <div className="panel-heading">
              <div><p className="section-kicker">SUBJECTS &amp; FACULTY</p><h2>Add what each teacher teaches</h2></div>
              <span className="count-badge">{subjects.length} subjects</span>
            </div>
            <p className="panel-intro">Add one row per subject assignment. A teacher can be assigned to multiple subjects. Lab sessions are optional for each subject.</p>
            <div className="subject-list">
              {subjects.map((subject, index) => (
                <div className="subject-row" key={subject.id}>
                  <span className={`subject-index ${subject.color}`}>{String(index + 1).padStart(2, '0')}</span>
                  <div className="subject-fields">
                    <input aria-label={`Subject code ${index + 1}`} value={subject.code} onChange={(event) => updateSubject(subject.id, { code: event.target.value })} placeholder="Code (e.g. AOA)" />
                    <input aria-label={`Subject name ${index + 1}`} value={subject.name} onChange={(event) => updateSubject(subject.id, { name: event.target.value })} placeholder="Subject name" />
                    <input aria-label={`Faculty name ${index + 1}`} value={subject.faculty} onChange={(event) => updateSubject(subject.id, { faculty: event.target.value })} placeholder="Faculty name" />
                    <label className="lab-toggle"><input type="checkbox" checked={subject.hasLab} onChange={(event) => updateSubject(subject.id, { hasLab: event.target.checked })} /> Has lab</label>
                    <button className="remove-subject" onClick={() => removeSubject(subject.id)} aria-label={`Remove subject ${index + 1}`}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="add-subject-button" onClick={addSubject}>+ Add subject</button>
          </div>
          <div className="panel rooms-panel">
            <div className="panel-heading">
              <div><p className="section-kicker">ROOMS</p><h2>Check rooms</h2></div>
              <span className="room-icon">+</span>
            </div>
            <p className="panel-intro">Add lecture rooms and lab rooms. Lab room names must start with L (for example, L101).</p>
            <div className="room-input">
              <input value={newRoom} onChange={(event) => setNewRoom(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addRoom()} placeholder="e.g. F205 or L101" />
              <button onClick={addRoom}>Add room</button>
            </div>
            <div className="room-chips">
              {rooms.map((room) => <span className="room-chip" key={room}>{room}<button onClick={() => removeRoom(room)} aria-label={`Remove ${room}`}>x</button></span>)}
            </div>
            <div className="availability">
              <div>
                <strong>Rooms available: {rooms.filter((room) => room.startsWith('L')).length} lab, {rooms.filter((room) => !room.startsWith('L')).length} lecture</strong>
                <small>Both EXCS A and EXCS B get a separate timetable. Lab sessions are included only for subjects marked “Has lab”.</small>
              </div>
            </div>
            <button className="generate-button" onClick={generateSchedule}>Generate all timetables <span>→</span></button>
            {notice && <p className="notice" role="alert">{notice}</p>}
          </div>
        </section>
      )}

      {activeView === 'schedule' && (
        <section className="schedule-section">
          <div className="schedule-heading">
            <div><p className="section-kicker">GENERATED CLASS TIMETABLE</p><h2>{selectedClass}</h2></div>
            <button className="secondary-button" onClick={() => setActiveView('setup')}>Edit setup</button>
          </div>
          {notice && <div className="success-banner"><span>✓</span>{notice}</div>}
          <WeeklyTimetable schedule={schedule} selectedClass={selectedClass} onSelectClass={setSelectedClass} />
          <div className="legend"><span>Timetables use randomized Graph Coloring while avoiding class, teacher, and room conflicts.</span></div>
        </section>
      )}

      {activeView === 'teachers' && (
        <section className="schedule-section">
          <div className="schedule-heading">
            <div><p className="section-kicker">INDIVIDUAL FACULTY VIEW</p><h2>Teacher timetable</h2></div>
            <button className="secondary-button" onClick={() => setActiveView('setup')}>Edit setup</button>
          </div>
          <label className="teacher-picker">Select a teacher
            <select value={activeTeacher} onChange={(event) => setSelectedTeacher(event.target.value)}>
              {teachers.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
            </select>
          </label>
          {teachers.length > 0
            ? <WeeklyTimetable schedule={teacherSchedule} />
            : <p className="empty-state">No teachers are assigned yet.</p>}
          <div className="legend"><span>Shows this teacher’s subjects across both EXCS A and EXCS B.</span></div>
        </section>
      )}

      {activeView === 'exams' && (
        <section className="schedule-section">
          <div className="schedule-heading">
            <div><p className="section-kicker">END-SEMESTER EXAMINATIONS</p><h2>Exam timetable</h2></div>
            <button className="secondary-button" onClick={() => setActiveView('setup')}>Edit setup</button>
          </div>
          <p className="exam-period">Exam period: November 16 – December 16, 2026. Exams are not scheduled on Sundays, with a randomly selected 1–2 free days between exams.</p>
          <div className="exam-list">
            {exams.map((exam, index) => (
              <article className="exam-row" key={exam.subject.id}>
                <span className="exam-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="exam-subject"><strong>{exam.subject.code}</strong><span>{exam.subject.name}</span></div>
                <time dateTime={exam.date}>{examDate(exam.date)}</time>
              </article>
            ))}
          </div>
          <p className="legend">Regenerate all timetables to randomly generate a new exam schedule.</p>
        </section>
      )}

      <footer><span>Analysis of Algorithms project</span><span>{subjects.length} subjects <i /> {rooms.length} rooms <i /> EXCS A &amp; EXCS B</span></footer>
    </main>
  )
}

export default App
