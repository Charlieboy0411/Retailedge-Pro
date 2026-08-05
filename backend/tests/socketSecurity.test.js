const http = require('http');
const ioServer = require('socket.io');
const ioClient = require('socket.io-client');
const quizEngine = require('../sockets/quizEngine');

// Mock models and logger to prevent DB dependencies in security test
jest.mock('../models/Session', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../models/Question', () => ({
  findByPk: jest.fn(),
}));
jest.mock('../models/Participant', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));
jest.mock('../models/Response', () => ({
  create: jest.fn(),
}));
jest.mock('../models/Quiz', () => ({}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Session = require('../models/Session');
const Question = require('../models/Question');
const Participant = require('../models/Participant');

describe('Socket.IO Security & Rate Limiting Integration Tests', () => {
  let server, io, port, clientSocket;

  beforeAll((done) => {
    server = http.createServer();
    io = ioServer(server);
    quizEngine(io);
    
    server.listen(() => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      'force new connection': true
    });
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    jest.clearAllMocks();
  });

  test('V16.1 Reject unauthorized room joins', (done) => {
    Session.findOne.mockResolvedValue(null); // Simulated non-existent room code

    clientSocket.emit('participant_join', { roomCode: '000000', name: 'Attacker' });

    clientSocket.on('error', (msg) => {
      expect(msg).toContain('Invalid Room Code');
      done();
    });
  });

  test('V16.5 Reject oversized answers (Payload Size Cap)', (done) => {
    // Large answer > 4KB
    const largeAnswer = 'A'.repeat(5000);

    clientSocket.emit('submit_answer', {
      roomCode: '123456',
      participantId: 1,
      questionId: 10,
      answer: largeAnswer,
      timeTaken: 1000
    });

    clientSocket.on('answer_rejected', (data) => {
      expect(data.reason).toBe('Payload too large');
      done();
    });
  });

  test('V16.6 Reject answer flooding (Rate Limiter)', (done) => {
    // Send 15 submissions in quick succession (limit is 10)
    let rejectedEmitted = false;

    clientSocket.on('answer_rejected', (data) => {
      if (data.reason === 'Too many submissions') {
        rejectedEmitted = true;
      }
    });

    for (let i = 0; i < 15; i++) {
      clientSocket.emit('submit_answer', {
        roomCode: '123456',
        participantId: 1,
        questionId: 10,
        answer: 'Option A',
        timeTaken: 1000
      });
    }

    setTimeout(() => {
      expect(rejectedEmitted).toBe(true);
      done();
    }, 500);
  });
});
