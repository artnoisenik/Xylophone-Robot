
exports.seed = function(knex, Promise) {
  return Promise.join(
    // Deletes ALL existing entries
    knex('users').del(),

    // Inserts seed entries
    knex('users').insert({ email: 'user1@example.com', password_hash: '$2a$10$b6vFmPjUz3eXYBVXaclrgeaQbBJPJ1KYq96kNXCXRRfiPXmiQVKhW'}),
    knex('users').insert({ email: 'user2@example.com', password_hash: '$2a$10$b6vFmPjUz3eXYBVXaclrgeaQbBJPJ1KYq96kNXCXRRfiPXmiQVKhW'}),
    knex('users').insert({ email: 'user3@example.com', password_hash: '$2a$10$b6vFmPjUz3eXYBVXaclrgeaQbBJPJ1KYq96kNXCXRRfiPXmiQVKhW'})
  );
};
