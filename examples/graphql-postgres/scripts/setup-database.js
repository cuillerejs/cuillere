import pg from 'pg';

const client = new pg.Client({host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres'});
await client.connect();


console.info('Creating tables...');
await client.query(`
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  "authorId" uuid references users(id) references users(id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  "authorId" uuid references users(id),
  "postId" uuid references posts(id) references posts(id)
);
`);

console.info('Seeding values...')
const { rows } = await client.query(`select * from users`);
if (rows.length === 0) {
  const { rows } = await client.query(`
    insert into users (username) values ('valentin') returning *;
  `)
  console.info('Seeded users: ', rows);
} else {
  console.info('Database already seeded: ', rows);
}

console.info('Done!');
await client.end();