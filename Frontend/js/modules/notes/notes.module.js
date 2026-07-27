import { API } from '../../api.js';
import { escapeHTML } from '../../utils/dom.js';

let currentPage = 1;
let totalPages = 1;
const NOTES_PER_PAGE = 10;
let editingNoteId = null;

// Elements
let notesList, noteForm, noteTitleInput, noteContentInput, noteTagsInput;
let editingNoteIdInput, formSubmitBtn, cancelEditBtn;
let prevPageBtn, nextPageBtn, pageInfoEl;

export function initNotesModule() {
  notesList = document.getElementById('notes-list');
  noteForm = document.getElementById('note-form');
  noteTitleInput = document.getElementById('note-title');
  noteContentInput = document.getElementById('note-content');
  noteTagsInput = document.getElementById('note-tags');
  editingNoteIdInput = document.getElementById('editingNoteId');
  formSubmitBtn = document.getElementById('form-submit-btn') || document.getElementById('note-submit-btn');
  cancelEditBtn = document.getElementById('cancel-edit-btn');

  prevPageBtn = document.getElementById('prev-page-btn');
  nextPageBtn = document.getElementById('next-page-btn');
  pageInfoEl = document.getElementById('page-info');

  setupEventListeners();
}

function setupEventListeners() {
  prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1 && !prevPageBtn.disabled) {
      currentPage--;
      renderNotes(currentPage);
    }
  });

  nextPageBtn?.addEventListener('click', () => {
    if (currentPage < totalPages && !nextPageBtn.disabled) {
      currentPage++;
      renderNotes(currentPage);
    }
  });

  noteForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeNoteId = editingNoteIdInput?.value || editingNoteId;
    const noteData = {
      title: noteTitleInput.value.trim(),
      content: noteContentInput.value.trim(),
      tags: noteTagsInput.value ? noteTagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (!noteData.title || !noteData.content) return;

    const res = activeNoteId ? await API.updateNote(activeNoteId, noteData) : await API.createNote(noteData);

    if (res.success || res._id || res.id || res.data) {
      resetNoteForm();
      renderNotes(currentPage);
    } else {
      alert(res.message || 'Failed to save note');
    }
  });

  cancelEditBtn?.addEventListener('click', resetNoteForm);

  notesList?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-note-btn');
    const deleteBtn = e.target.closest('.delete-note-btn');

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this note?')) {
        await API.deleteNote(id);
        renderNotes(currentPage);
      }
    }

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      const res = await API.getNote(id);
      const note = res.data?.note || res.note || res.data || res;

      if (note) {
        editingNoteId = note._id || note.id;
        if (editingNoteIdInput) editingNoteIdInput.value = editingNoteId;
        if (noteTitleInput) noteTitleInput.value = note.title || '';
        if (noteContentInput) noteContentInput.value = note.content || '';
        if (noteTagsInput) noteTagsInput.value = (note.tags || []).join(', ');
        if (formSubmitBtn) formSubmitBtn.innerText = 'Update Note';
        if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
      }
    }
  });
}

export async function renderNotes(targetPage) {
  if (!notesList) return;

  if (targetPage !== undefined && targetPage !== null) {
    currentPage = Number(targetPage);
  }

  notesList.innerHTML = `<div class="col-span-full text-center text-slate-400 py-8">Loading notes (Page ${currentPage})...</div>`;

  const res = await API.listNotes(currentPage, NOTES_PER_PAGE);

  if (!res.success && res.message) {
    notesList.innerHTML = `<p class="text-red-400 text-sm col-span-full">${escapeHTML(res.message)}</p>`;
    return;
  }

  const responseData = res.data || res;
  const notes = responseData.notes || (Array.isArray(responseData) ? responseData : []);
  const meta = responseData.meta || responseData.pagination || {};

  const totalCount = meta.total || meta.totalCount || responseData.total || notes.length;
  totalPages = Number(meta.totalPages || responseData.totalPages) || Math.ceil(totalCount / NOTES_PER_PAGE) || 1;

  if (notes.length === 0) {
    notesList.innerHTML = `<p class="text-slate-500 text-sm col-span-full">No notes found on page ${currentPage}. Create one above!</p>`;
    updatePaginationUI({ page: currentPage, totalPages, hasNextPage: false, hasPrevPage: currentPage > 1 });
    return;
  }

  notesList.innerHTML = notes.map(note => {
    const noteId = note._id || note.id;
    const authorName = note.owner?.name || note.author?.name || note.user?.name || 'You';

    return `
      <div class="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-colors">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-white text-base">${escapeHTML(note.title)}</h3>
            <div class="flex gap-2">
              <button data-id="${noteId}" class="edit-note-btn text-slate-400 hover:text-emerald-400 text-xs font-semibold">Edit</button>
              <button data-id="${noteId}" class="delete-note-btn text-slate-500 hover:text-red-400 text-xs font-semibold">Delete</button>
            </div>
          </div>
          <p class="text-slate-300 text-sm mb-4 leading-relaxed">${escapeHTML(note.content)}</p>
        </div>
        <div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            ${(note.tags || []).map(t => `<span class="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-mono">${escapeHTML(t)}</span>`).join('')}
          </div>
          <div class="text-[11px] text-slate-500 border-t border-slate-700/40 pt-2 flex justify-between">
            <span>Author: <strong class="text-slate-400">${escapeHTML(authorName)}</strong></span>
            <span>${note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recently'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updatePaginationUI({
    page: currentPage,
    totalPages,
    hasPrevPage: meta.hasPrevPage ?? (currentPage > 1),
    hasNextPage: meta.hasNextPage ?? (currentPage < totalPages)
  });
}

function updatePaginationUI(meta = {}) {
  const page = meta.page || currentPage;
  const total = meta.totalPages || totalPages || 1;
  const hasPrev = meta.hasPrevPage ?? (page > 1);
  const hasNext = meta.hasNextPage ?? (page < total);

  if (pageInfoEl) pageInfoEl.innerText = `Page ${page} of ${total}`;

  if (prevPageBtn) {
    prevPageBtn.disabled = !hasPrev;
    prevPageBtn.classList.toggle('opacity-50', !hasPrev);
    prevPageBtn.classList.toggle('cursor-not-allowed', !hasPrev);
  }

  if (nextPageBtn) {
    nextPageBtn.disabled = !hasNext;
    nextPageBtn.classList.toggle('opacity-50', !hasNext);
    nextPageBtn.classList.toggle('cursor-not-allowed', !hasNext);
  }
}

function resetNoteForm() {
  editingNoteId = null;
  if (editingNoteIdInput) editingNoteIdInput.value = '';
  if (noteForm) noteForm.reset();
  if (formSubmitBtn) formSubmitBtn.innerText = 'Save Note';
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
}