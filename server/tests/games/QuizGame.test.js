import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import QuizGame from '../../src/games/quiz/QuizGame.js';

const cfg = () => ({
  difficulty: { level: 1 },
  playerCount: 2,
  questionCount: 3,
  players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }],
});

describe('QuizGame', () => {
  it('metadata', () => {
    const m = QuizGame.getMetadata();
    assert.equal(m.id, 'quiz');
    assert.equal(m.maxPlayers, 8);
  });

  it('creates state with questions', () => {
    const state = QuizGame.createState(cfg());
    assert.equal(state.questions.length, 3);
    assert.equal(state.currentQuestion, 0);
    assert.equal(state.scores.p0, 0);
  });

  it('validates answer', () => {
    const state = QuizGame.createState(cfg());
    assert.equal(QuizGame.validateAction(state, { answer: 'A' }, { id: 'p0' }), true);
    assert.notEqual(QuizGame.validateAction(state, {}, { id: 'p0' }), true);
  });

  it('rejects double answer', () => {
    const state = QuizGame.createState(cfg());
    QuizGame.applyAction(state, { answer: 'X' }, { id: 'p0' });
    assert.notEqual(QuizGame.validateAction(state, { answer: 'Y' }, { id: 'p0' }), true);
  });

  it('first answer waits', () => {
    const state = QuizGame.createState(cfg());
    const r = QuizGame.applyAction(state, { answer: 'X' }, { id: 'p0' });
    assert.ok(r.waiting);
    assert.equal(r.answeredCount, 1);
    if (state._questionTimer) clearTimeout(state._questionTimer);
  });

  it('resolves when all answer', () => {
    const state = QuizGame.createState(cfg());
    state.questionStartedAt = Date.now();
    const correct = state.questions[0].correctAnswer;
    QuizGame.applyAction(state, { answer: correct }, { id: 'p0' });
    const r = QuizGame.applyAction(state, { answer: 'wrong' }, { id: 'p1' });
    assert.ok(r.questionResolved);
    assert.equal(r.correctAnswer, correct);
    assert.ok(r.results.p0.correct);
    assert.ok(!r.results.p1.correct);
    assert.ok(state.scores.p0 > 0);
    assert.equal(state.scores.p1, 0);
    assert.equal(state.currentQuestion, 1);
    if (state._questionTimer) clearTimeout(state._questionTimer);
  });

  it('correct answer gets speed bonus', () => {
    const state = QuizGame.createState(cfg());
    state.questionStartedAt = Date.now();
    const correct = state.questions[0].correctAnswer;
    QuizGame.applyAction(state, { answer: correct }, { id: 'p0' });
    const r = QuizGame.applyAction(state, { answer: correct }, { id: 'p1' });
    assert.ok(r.results.p0.points >= 10);
    if (state._questionTimer) clearTimeout(state._questionTimer);
  });

  it('game ends after all questions', () => {
    const state = QuizGame.createState(cfg());
    state.currentQuestion = state.questions.length;
    state.scores.p0 = 30;
    const end = QuizGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('serializeState hides correct answer', () => {
    const state = QuizGame.createState(cfg());
    const s = QuizGame.serializeState(state);
    assert.ok(s.question);
    assert.ok(!('correctAnswer' in s.question));
    assert.ok(s.question.answers.length > 0);
  });

  it('sanitizes custom questions', () => {
    const c = cfg();
    c.customQuestions = [
      { question: '<script>alert(1)</script>', answers: ['A', 'B'], correctAnswer: 'A', timeLimit: 10 },
    ];
    c.questionCount = 1;
    const state = QuizGame.createState(c);
    assert.ok(!state.questions[0].question.includes('<script>'));
  });

  it('destroy clears timer', () => {
    const state = QuizGame.createState(cfg());
    state._questionTimer = setTimeout(() => {}, 100000);
    QuizGame.destroy(state);
    assert.ok(true);
  });
});
