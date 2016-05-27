
exports.up = function(knex, Promise) {
  return knex.schema.createTable('songs', table =>{
    table.increments();
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.string('title').notNullable();
    table.text('song').notNullable();
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('songs');
};
