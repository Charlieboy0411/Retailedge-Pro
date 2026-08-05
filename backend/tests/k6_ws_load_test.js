import ws from 'k6/ws';
import { check, sleep } from 'k6';

/**
 * k6 load test configuration.
 * Simulates 30 virtual users connecting via WebSocket, joining a room,
 * and receiving questions.
 * 
 * Run using: k6 run k6_ws_load_test.js
 */
export const options = {
  stages: [
    { duration: '30s', target: 30 }, // ramp up to 30 users
    { duration: '1m', target: 30 },  // sustain load
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    'checks': ['rate>0.99'], // 99% of connections must be successful
  },
};

const ROOM_CODE = '123456'; // Target room for load test

export default function () {
  const url = 'ws://localhost:5000/socket.io/?transport=websocket';
  
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Connect to the room
      socket.send(JSON.stringify([
        'participant_join',
        {
          roomCode: ROOM_CODE,
          name: `StressUser_${__VU}_${__ITER}`,
          deviceId: `dev_${__VU}_${__ITER}`
        }
      ]));
    });

    socket.on('message', function (message) {
      // parse Socket.io message protocol if needed
      if (message.includes('new_question')) {
        // Mock slow/fast thinking response time (1-4 seconds)
        sleep(Math.random() * 3 + 1);

        socket.send(JSON.stringify([
          'submit_answer',
          {
            roomCode: ROOM_CODE,
            participantId: __VU,
            questionId: 1,
            answer: 'Option A',
            timeTaken: 2000
          }
        ]));
      }
    });

    socket.on('close', () => {
      // Clean cleanup
    });

    socket.setTimeout(function () {
      socket.close();
    }, 90000); // 90 second lifespan
  });

  check(res, { 'status is 101 (WS Handshake)': (r) => r && r.status === 101 });
}
