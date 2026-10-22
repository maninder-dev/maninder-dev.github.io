<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Domain tables shared by the handbook examples (users extras, blog, RBAC, tenancy).
 * The orders table has its own migration (Topic 35).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('subdomain')->unique();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->boolean('is_admin')->default(false);
            $table->boolean('is_super_admin')->default(false);
            $table->string('role', 20)->default('member');
            $table->string('plan', 20)->nullable();          // Topic 20: subscribed:pro middleware
            $table->boolean('subscribed')->default(false);   // Topic 103: newsletter opt-in
            $table->boolean('notified')->default(false);     // Topic 38 / 99: chunk vs chunkById
            $table->boolean('active')->default(true);
            $table->text('phone')->nullable();               // Topic 32: encrypted cast
            $table->json('settings')->nullable();
            $table->foreignId('country_id')->nullable()->constrained();
            $table->foreignId('tenant_id')->nullable()->constrained();
        });

        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('bio')->nullable();
        });

        // Topic 27 / 52: roles with pivot data, and a tiny permissions table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
            $table->primary(['role_id', 'user_id']);
        });
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['permission_id', 'role_id']);
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('body')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('views')->default(0);
            $table->json('meta')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->timestamps();
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->morphs('commentable');                  // commentable_id + commentable_type
            $table->foreignId('user_id')->nullable()->constrained();
            $table->text('body');
            $table->boolean('approved')->default(false);
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');
        });

        // Topic 88: single-database tenancy
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained();
            $table->string('name');
            $table->timestamps();
        });
        // Topic 95: extra data on a many-to-many pivot
        Schema::create('project_user', function (Blueprint $table) {
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20);
            $table->timestamp('joined_at')->nullable();
        });

        // Topic 10: logs:prune command
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('message');
            $table->timestamps();
        });

        // Topic 65: broadcasting
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::create('room_user', function (Blueprint $table) {
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        });
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['messages', 'room_user', 'rooms', 'activity_logs', 'project_user', 'projects', 'taggables', 'tags',
            'comments', 'videos', 'posts', 'categories', 'permission_role', 'permissions', 'role_user', 'roles',
            'profiles'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('country_id');
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropColumn(['first_name', 'last_name', 'is_admin', 'is_super_admin', 'role', 'plan',
                'subscribed', 'notified', 'active', 'phone', 'settings']);
        });
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('countries');
    }
};
