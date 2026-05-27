import React from 'react';
import { Layout } from '../components/Layout';
import UsersManager from '../components/UsersManager';

const UsersPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-3xl">
        <UsersManager />
      </div>
    </Layout>
  );
};

export default UsersPage;
