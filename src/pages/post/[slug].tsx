/* eslint-disable no-param-reassign */
import {
  GetStaticPaths,
  GetStaticPathsResult,
  GetStaticProps,
  GetStaticPropsResult,
} from 'next';
import { RichText } from 'prismic-dom';
import { FaCalendarAlt, FaUserAlt } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { ptBR } from 'date-fns/locale';
import Head from 'next/head';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { Utteranc } from '../../components/Utteranc';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
}

export default function Post({ post, preview }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const formatedDate = format(
    new Date(post?.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const totalWorlds = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    // eslint-disable-next-line no-param-reassign
    words.map(word => {
      // eslint-disable-next-line no-return-assign
      return (total += word);
    });
    return total;
  }, 0);

  const readTime = Math.ceil(totalWorlds / 200);

  return (
    <>
      <Head>
        <title>{`${post.data.title} | spacetraveling`}</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} alt="Banner" className={styles.banner} />
      <main className={commonStyles.container}>
        <section className={styles.post}>
          <h1>{post.data.title}</h1>
          <div>
            <ul>
              <li>
                <FaCalendarAlt />
                {formatedDate}
              </li>
              <li>
                <FaUserAlt />
                {post.data.author}
              </li>
              <li>
                <FiClock />
                {`${readTime} min`}
              </li>
            </ul>
            <span />
            {post.data.content.map(content => (
              <article key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            ))}
          </div>
        </section>
        <section className={styles.postNavigation}>
          <div>
            <p>Nome do Post</p>
            <Link href="/">
              <a>Post anterior</a>
            </Link>
          </div>
          <div>
            <p>Nome do Post</p>
            <Link href="/asdasd">
              <a>Pr??ximo post</a>
            </Link>
          </div>
        </section>
        <Utteranc />
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.previewButton}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevpost = await prismic.query(
    Prismic.predicates.at('document.type', 'post'),
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[my.post.first_publication_date]',
    }
  );

  console.log('Prev', prevpost);
  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_update_date: response.last_publication_date,
    // next_page: pagination.next_page,
    // prev_pag: pagination.prev_page,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };
  return {
    props: {
      post,
      preview,
    },
    revalidate: 60 * 30, // 30 minutos,
  };
};
