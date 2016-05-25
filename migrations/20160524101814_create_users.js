
exports.up = function(knex, Promise) {
  return knex.schema.createTable('users', table =>{
    table.increments();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
