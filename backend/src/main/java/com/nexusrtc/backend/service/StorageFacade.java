package com.nexusrtc.backend.service;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class StorageFacade {

    private final MinioClient minioClient;
    private final String bucketName;

    // Credentials and endpoint come from environment variables (see application.yml).
    public StorageFacade(
            @Value("${minio.url}") String url,
            @Value("${aws.access.key.id}") String accessKey,
            @Value("${aws.secret.access.key}") String secretKey,
            @Value("${minio.bucket.name}") String bucketName) {

        this.bucketName = bucketName;
        this.minioClient = MinioClient.builder()
                .endpoint(url)
                .credentials(accessKey, secretKey)
                .build();
    }

    /**
     * Uploads a multipart file and returns its object key.
     */
    public String uploadFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file container payload.");
        }

        try {
            // UUID prefix avoids collisions. KNOWN ISSUE (S7): the original filename is appended unsanitized.
            String uniqueFileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(uniqueFileName)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build()
                );
            }

            // The key is stored on the chat message as attachmentPath.
            return uniqueFileName;

        } catch (Exception e) {
            throw new RuntimeException("Fatal error parsing object storage stream transmission line: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a time-limited presigned GET URL for an object.
     * Note: the bucket is currently public (k8s/minio-init-job.yml, S7), so this doesn't restrict access
     * yet. It also presigns any key it is given; callers must check authorization first.
     */
    public String getPresignedUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectKey)
                            .expiry(2, TimeUnit.HOURS) // 2-hour expiry
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate secure presigned object target download vector: " + e.getMessage(), e);
        }
    }
}