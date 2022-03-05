import { GetStaticProps } from 'next';
import React, { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form';
import PortableText from 'react-portable-text';
import Header from '../../components/Header';
import { sanityClient, urlFor } from '../../sanity';
import { Post } from '../../typings';

type Props = {
    post: Post
}

interface IInputForm {
    _id: string;
    name: string;
    email: string;
    comment: string;
}

function Post({ post }: Props) {
    const { register, handleSubmit, formState: { errors } } = useForm<IInputForm>();
    const [submitted, setSubmitted] = useState<boolean>(false);
    console.log(post);

    const submit: SubmitHandler<IInputForm> = (data) => {
        fetch('/api/createComment', {
            method: 'POST',
            body: JSON.stringify(data)
        })
            .then(() => {
                console.log(data);
                setSubmitted(true);
            })
            .catch(err => {
                console.log(err);
                setSubmitted(false);
            });
    }

    return (
        <main>
            <Header />
            <img src={urlFor(post.mainImage).url()!} alt=""
                className='w-full h-40 object-cover'
            />
            <article className='max-w-3xl mx-auto p-5'>
                <h1 className='text-3xl mt-10 mb-3'>
                    {post.title}
                </h1>
                <h2 className='text-gray-500 text-xl font-light mb-2'>{post.description}</h2>
                <div className='flex items-center space-x-2'>
                    <img src={urlFor(post.author.image).url()!} alt=""
                        className='w-10 h10 rounded-full'
                    />
                    <p className='text-sm font-extralight'>
                        Blog post by <span className='text-green-600'> {post.author.name}</span> -
                        Published at {new Date(post._createdAt).toLocaleString()}
                    </p>
                </div>
                <div className='mt-10'>
                    <PortableText
                        content={post.body}
                        dataset={process.env.NEXT_PUBLIC_SANITY_DATASET!}
                        projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!}
                        className=''
                        serializers={{
                            h1: (props: any) => <h1 className='text-2xl font-bold my-5' {...props} />,
                            h2: (props: any) => <h1 className='text-2xl font-bold my-5' {...props} />,
                            li: ({ children }: any) => <li className="ml-4 list-disc">{children}</li>,
                            link: ({ href, children }: any) => <a href={href} className='text-blue-500 hover:underline'>{children}</a>
                        }}
                    />
                </div>
            </article>
            <hr className='max-w-lg my5 mx-auto border border-purple-700' />
            {submitted
                ? (
                    <div className="my-10 mx-auto flex max-w-2xl flex-col bg-lime-500 p-10 text-white">
                        <h3 className="text-3xl font-bold">
                            Thank you for submitting your comment
                        </h3>
                        <p>Once it has been approved, it will appear below!</p>
                    </div>
                )
                : (
                    <form
                        className="my-10 mx-auto flex max-w-2xl flex-col p-5"
                        onSubmit={handleSubmit(submit)}
                    >
                        <input type="hidden" value={post._id} name="_id"
                            {...register("_id")}
                        />
                        <label className="mb-5 block">
                            <span className="text-gray-700">Name</span>
                            <input
                                {...register("name", { required: true })}
                                className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-purple-700 focus:ring"
                                placeholder="Jone Doe"
                                type="text"
                            />
                        </label>

                        <label className="mb-5 block">
                            <span className="text-gray-700">Email</span>
                            <input
                                {...register('email', { required: true })}
                                className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-purple-700 focus:ring"
                                placeholder="Jone Doe"
                                type="email"
                            />
                        </label>

                        <label className="mb-5 block">
                            <span className="text-gray-700">Comment</span>
                            <textarea
                                {...register('comment', { required: true })}
                                className="form-textarea mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-purple-700 focus:ring"
                                placeholder="Jone Doe"
                                rows={8}
                            />
                        </label>
                        {/* errors will return when field validation fails  */}
                        <div className='flex flex-col p-5'>
                            {errors.name && <span className='text-red-500'>- The Name Field is required</span>}
                            {errors.email && <span className='text-red-500'>- The Email Field is required</span>}
                            {errors.comment && <span className='text-red-500'>- The Comment Field is required</span>}
                        </div>
                        <input
                            type="submit"
                            className="focus:shadow-outline fond-bold cursor-pointer rounded bg-purple-700 py-2 px-4 text-white shadow hover:bg-purple-400 focus:shadow-none"
                        />
                    </form>
                )
            }
            {/* Comments */}
            <div className="my-10 mx-auto flex max-w-2xl flex-col space-y-2 p-10 shadow shadow-pink-400">
                <h3 className="text-4xl">Comments</h3>

                <hr className="pb-2" />

                {post.comments.map((comment) => (
                    <div key={comment._id} className="">
                        <p>
                            <span className="text-pink-500">{comment.name}:</span>{' '}
                            {comment.comment}
                        </p>
                    </div>
                ))}
            </div>
        </main >
    )
}

export default Post

export const getStaticPaths = async () => {
    const query = `*[_type == "post"]{
        _id,
        slug
      }`;

    const posts = await sanityClient.fetch(query);
    const paths = posts.map((post: Post) => ({
        params: {
            slug: post.slug.current
        }
    }))

    return {
        paths,
        fallback: 'blocking'
    }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const query = `
    *[_type == "post" && slug.current == $slug][0]{
        _id,
        title,
        slug,
        author -> {
          name,
          image
        },
      'comments': *[_type == "comment" && 
           post._ref == ^._id && 
           approved == true],
      description,
      mainImage,
      slug,
      body
      }
  `;
    const post = await sanityClient.fetch(query, {
        slug: params?.slug
    });

    if (!post) return {
        notFound: true
    }

    return {
        props: {
            post
        },
        revalidate: 60 // afetr 60 seconds, it ll update the old cached version
    }
}

