# Photon Timetable Generator

A web app for creating class timetables, faculty schedules, and exam schedules.

## Scheduling algorithm

The app uses randomized graph coloring with backtracking to assign classes to
weekday and time slots while avoiding class, faculty, and room conflicts.
Lectures and labs for the same subject are also scheduled on different days.
