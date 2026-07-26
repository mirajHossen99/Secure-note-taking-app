import express from 'express';
import { createNote, deleteNote, getNote, updateNote } from '../controllers/noteController.js';
import requireAuth from '../middleware/auth.js';


const router = express.Router();

router.use(requireAuth);

router.post('/', createNote);
// router.get('/', listNotes);
router.get('/:id', getNote);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;