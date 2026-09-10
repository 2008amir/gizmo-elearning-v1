export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_days: {
        Row: {
          created_at: string
          day: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          answers: Json | null
          assignment_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_via: string | null
          id: string
          score_pct: number | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_via?: string | null
          id?: string
          score_pct?: number | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_via?: string | null
          id?: string
          score_pct?: number | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          max_points: number
          questions: Json
          submission_types: Json
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          max_points?: number
          questions?: Json
          submission_types?: Json
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          max_points?: number
          questions?: Json
          submission_types?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string | null
          id: string
          starts_at: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          id?: string
          starts_at: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          id?: string
          starts_at?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          exam_id: string | null
          id: string
          issued_at: string
          score_pct: number | null
          serial: string
          user_id: string
        }
        Insert: {
          course_id: string
          exam_id?: string | null
          id?: string
          issued_at?: string
          score_pct?: number | null
          serial: string
          user_id: string
        }
        Update: {
          course_id?: string
          exam_id?: string | null
          id?: string
          issued_at?: string
          score_pct?: number | null
          serial?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          research_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          research_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          research_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          allow_open_join: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          invite_code: string
          member_count: number
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          allow_open_join?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          member_count?: number
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          allow_open_join?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          member_count?: number
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          decided_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          community_id: string
          content: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          community_id: string
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          community_id?: string
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          last_accessed_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          last_accessed_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          last_accessed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          account_name: string | null
          bank_name: string | null
          course_id: string
          created_at: string
          id: string
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          bank_name?: string | null
          course_id: string
          created_at?: string
          id?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          bank_name?: string | null
          course_id?: string
          created_at?: string
          id?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating?: number
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          certificate_enabled: boolean | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          featured: boolean | null
          id: string
          image_url: string | null
          instructor_id: string | null
          learn_points: string[] | null
          level: string | null
          overview: string | null
          price: number
          purchase_enabled: boolean
          rating_avg: number | null
          rating_count: number | null
          title: string
          total_lessons: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          certificate_enabled?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          learn_points?: string[] | null
          level?: string | null
          overview?: string | null
          price?: number
          purchase_enabled?: boolean
          rating_avg?: number | null
          rating_count?: number | null
          title: string
          total_lessons?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          certificate_enabled?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          learn_points?: string[] | null
          level?: string | null
          overview?: string | null
          price?: number
          purchase_enabled?: boolean
          rating_avg?: number | null
          rating_count?: number | null
          title?: string
          total_lessons?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json | null
          course_id: string
          created_at: string
          id: string
          passed: boolean
          question_ids: Json | null
          score_pct: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          course_id: string
          created_at?: string
          id?: string
          passed?: boolean
          question_ids?: Json | null
          score_pct?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          course_id?: string
          created_at?: string
          id?: string
          passed?: boolean
          question_ids?: Json | null
          score_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_index: number
          course_id: string
          created_at: string
          id: string
          options: Json
          question: string
          source: string | null
        }
        Insert: {
          correct_index?: number
          course_id: string
          created_at?: string
          id?: string
          options?: Json
          question: string
          source?: string | null
        }
        Update: {
          correct_index?: number
          course_id?: string
          created_at?: string
          id?: string
          options?: Json
          question?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          title: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          title?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          title?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          research_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          research_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          research_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          assignment_alerts: boolean | null
          community_mentions: boolean | null
          course_reminders: boolean | null
          email_updates: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_alerts?: boolean | null
          community_mentions?: boolean | null
          course_reminders?: boolean | null
          email_updates?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_alerts?: boolean | null
          community_mentions?: boolean | null
          course_reminders?: boolean | null
          email_updates?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organisation_settings: {
        Row: {
          id: number
          logo_url: string | null
          org_name: string | null
          primary_color: string | null
          support_email: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          logo_url?: string | null
          org_name?: string | null
          primary_color?: string | null
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          logo_url?: string | null
          org_name?: string | null
          primary_color?: string | null
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          otp_code: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          otp_code: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          otp_code?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      pending_signups: {
        Row: {
          attempts: number
          country: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          otp_code: string
          password: string
          username: string
        }
        Insert: {
          attempts?: number
          country?: string
          created_at?: string
          email: string
          expires_at: string
          first_name?: string
          id?: string
          last_name?: string
          otp_code: string
          password: string
          username: string
        }
        Update: {
          attempts?: number
          country?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          last_name?: string
          otp_code?: string
          password?: string
          username?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          content_html: string | null
          created_at: string
          description: string | null
          header_image_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content_html?: string | null
          created_at?: string
          description?: string | null
          header_image_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content_html?: string | null
          created_at?: string
          description?: string | null
          header_image_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          first_name: string | null
          id: string
          is_blocked: boolean
          last_name: string | null
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          is_blocked?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      research: {
        Row: {
          author_id: string | null
          category: string | null
          content_html: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          header_image_url: string | null
          id: string
          order_index: number | null
          research_number: string | null
          research_type: string | null
          section: string | null
          section_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          header_image_url?: string | null
          id?: string
          order_index?: number | null
          research_number?: string | null
          research_type?: string | null
          section?: string | null
          section_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          header_image_url?: string | null
          id?: string
          order_index?: number | null
          research_number?: string | null
          research_type?: string | null
          section?: string | null
          section_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      research_progress: {
        Row: {
          created_at: string
          id: string
          research_id: string
          research_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          research_id: string
          research_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          research_id?: string
          research_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_progress_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_research: {
        Row: {
          created_at: string
          research_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          research_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          research_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_research_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_purchases: {
        Args: { _status: string }
        Returns: {
          account_name: string
          bank_name: string
          course_id: string
          course_price: number
          course_title: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          receipt_url: string
          status: string
          user_id: string
          username: string
        }[]
      }
      admin_review_purchase: {
        Args: { _action: string; _purchase_id: string }
        Returns: undefined
      }
      create_post_and_broadcast: {
        Args: {
          _content_html: string
          _description: string
          _header_image_url: string
          _title: string
        }
        Returns: string
      }
      decide_join_request: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      gen_invite_code: { Args: never; Returns: string }
      get_active_history: {
        Args: { period: string }
        Returns: {
          bucket: string
          count: number
          start: string
        }[]
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_any_admin_id: { Args: never; Returns: string }
      get_exam_questions: {
        Args: { _course_id: string }
        Returns: {
          id: string
          options: Json
          question: string
        }[]
      }
      get_my_auth_state: {
        Args: never
        Returns: {
          is_admin: boolean
          profile: Json
        }[]
      }
      get_public_certificate: {
        Args: { _serial: string; _username: string }
        Returns: Json
      }
      get_user_detail: { Args: { _user_id: string }; Returns: Json }
      grade_assignment_objective: {
        Args: { _submission_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_member: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      is_community_owner: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      join_community_by_code: { Args: { _code: string }; Returns: Json }
      record_my_activity: { Args: never; Returns: undefined }
      request_or_join_community: {
        Args: { _community_id: string }
        Returns: Json
      }
      submit_exam: {
        Args: { _answers: Json; _course_id: string; _question_ids: string[] }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
